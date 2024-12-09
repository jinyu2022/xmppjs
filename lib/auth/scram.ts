// FIXME: 有大问题，加密问题

/**
 * 对两个 ArrayBuffer 进行异或运算
 * @param x 第一个 ArrayBuffer
 * @param y 第二个 ArrayBuffer
 * @returns 异或运算结果的新 ArrayBuffer
 */
function xorArrayBuffers(x: ArrayBufferLike, y: ArrayBufferLike): ArrayBuffer {
  // 将输入的 ArrayBuffer 转换为 Uint8Array 以便进行位运算
  const xIntArray = new Uint8Array(x);
  const yIntArray = new Uint8Array(y);
  // 创建新的 Uint8Array 用于存储结果
  const zIntArray = new Uint8Array(x.byteLength);

  // 逐字节进行异或运算
  for (let i = 0; i < x.byteLength; i++) {
    zIntArray[i] = xIntArray[i] ^ yIntArray[i];
  }

  // 返回结果的 ArrayBuffer
  return zIntArray.buffer;
}

/**
 * 将字符串转换为 ArrayBuffer
 */
function stringToArrayBuf(str: string) {
  const bytes = new TextEncoder().encode(str);
  return bytes.buffer;
}

/**
 * 计算客户端证明 (client proof)
 * @param authMessage 认证消息
 * @param clientKey 客户端密钥
 * @param hashName 哈希算法名称
 * @returns 客户端证明
 */
export async function scramClientProof(
  authMessage: string,
  clientKey: ArrayBufferLike,
  hashName: string
) {
  // 使用指定哈希算法处理客户端密钥
  const hashedKey = await crypto.subtle.digest(hashName, clientKey);
  // 导入处理后的密钥
  const storedKey = await crypto.subtle.importKey(
    "raw",
    hashedKey,
    { name: "HMAC", hash: hashName },
    false,
    ["sign"]
  );
  // 计算客户端签名
  const clientSignature = await crypto.subtle.sign(
    "HMAC",
    storedKey,
    stringToArrayBuf(authMessage)
  );

  // 计算并返回客户端证明
  return xorArrayBuffers(clientKey, clientSignature);
}

/**
 * 此函数将 SASL SCRAM 挑战响应中的信息解析为以下形式的对象，失败时返回 null
 * @example
 * {
 *   nonce: String,
 *   salt:  ArrayBuffer,
 *   iter:  Int
 * }
 */
export function scramParseChallenge(challenge: string) {
  // 初始化返回值
  let nonce: string | undefined;
  let salt: ArrayBuffer | undefined;
  let iter: number | undefined;

  // 匹配属性的正则表达式
  const ATTRIB_PATTERN = /([a-z]+)=([^,]+)(?:,|$)/;
  let remainingChallenge = challenge;

  // 逐个解析属性
  while (remainingChallenge.length > 0) {
    const matches = ATTRIB_PATTERN.exec(remainingChallenge);
    if (!matches) break;

    // 更新剩余字符串
    remainingChallenge = remainingChallenge.replace(matches[0], "");

    // 根据属性名称处理值
    switch (matches[1]) {
      case "r": // nonce
        nonce = matches[2];
        break;

      case "s": // salt
        salt = Buffer.from(matches[2], "base64").buffer;
        break;

      case "i": // iteration count
        iter = parseInt(matches[2], 10);
        break;

      case "m": // mandatory extension
        console.warn("遇到未知的强制扩展，根据 RFC 5802 规范需要中止");
        return null;

      default: // optional extension
        // 非强制扩展，根据 RFC 5802 我们应该忽略它
        console.debug(`忽略可选扩展: ${matches[1]}`);
        break;
    }
  }

  // 验证必要字段
  if (!nonce) {
    console.warn("服务器未提供 nonce");
    return null;
  }

  if (!salt) {
    console.warn("服务器未提供有效的盐值");
    return null;
  }
  // 考虑迭代次数少于 4096 不安全，如 RFC 5802 所建议
  if (!iter || iter < 4096) {
    console.warn(`迭代次数 ${iter} 小于安全最小值 4096`);
    return null;
  }

  return { nonce, salt, iter };
}

/**
 * 给定字符串密码、哈希名称和位长度，派生客户端和服务器密钥。
 * 返回以下形式的对象：
 * @example
 * { ck: ArrayBuffer, // 客户端密钥
 *   sk: ArrayBuffer, // 服务器密钥
 * }
 * @param password 密码
 * @param salt 盐值
 * @param iter 迭代次数
 * @param hashName 哈希算法名称
 * @param hashBits 哈希算法位长度
 */
export async function scramDeriveKeys(
  password: string,
  salt: ArrayBuffer,
  iter: number,
  hashName: string,
  hashBits: number
) {
  const saltedPasswordBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: iter, hash: { name: hashName } },
    await crypto.subtle.importKey(
      "raw",
      stringToArrayBuf(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    ),
    hashBits
  );
  const saltedPassword = await crypto.subtle.importKey(
    "raw",
    saltedPasswordBits,
    { name: "HMAC", hash: hashName },
    false,
    ["sign"]
  );

  return {
    ck: await crypto.subtle.sign(
      "HMAC",
      saltedPassword,
      stringToArrayBuf("Client Key")
    ),
    sk: await crypto.subtle.sign(
      "HMAC",
      saltedPassword,
      stringToArrayBuf("Server Key")
    ),
  };
}

/**
 * 计算服务器签名
 * @param authMessage 认证消息
 * @param serverKey 服务器密钥
 * @param hashName 哈希算法名称 (如 'SHA-1', 'SHA-256' 等)
 */
export async function scramServerSign(
  authMessage: string,
  serverKey: ArrayBufferLike,
  hashName: string
) {
  // 导入服务器密钥用于 HMAC 运算
  const importedServerKey = await crypto.subtle.importKey(
    "raw",
    serverKey,
    { name: "HMAC", hash: hashName },
    false,
    ["sign"]
  );

  // 使用 HMAC 计算服务器签名
  return crypto.subtle.sign(
    "HMAC",
    importedServerKey,
    stringToArrayBuf(authMessage)
  );
}

/**
 * 生成指定长度的随机数
 * @param length 需要的随机数长度，默认为 16
 * @returns 随机数
 */
export function generateSecureNonce(length: number = 16) {
  // 生成随机字节
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // 转换为 base64 并移除特殊字符
  return (
    Buffer.from(array)
      .toString("base64")
      // 替换特殊字符
      .replace(/[+\/=]/g, "")
      // 截取指定长度
      .slice(0, length)
  );
}

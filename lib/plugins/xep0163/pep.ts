import { JID } from "@/JID";
import { Pubsub } from "../xep0060/pubsub";
export class PEP {
    
    /**
     * 创建一个检索项目的 IQ 请求。
     * @param to - 要发送请求的 JID。
     * @param node - 要检索项目的节点标识符。
     * @param max - 可选，返回的最大项目数量。
     * @param id - 可选，IQ 请求的唯一标识符。
     * @returns 返回构建好的 IQ 消息元素，用于请求检索指定节点的项目。
     */
    static createRetrieveItemsIq(to: string|JID, node: string, max?: number, id?: string){
        return Pubsub.createRetrieveItemsIq(to, node, max, id);
    }
    /**
     * 创建一个发布消息的iq
     * @param publish 
     * @param publishOptions
     * @returns 
     */
    static createPublishIq(publish: Element, publishOptions?: Element){
        return Pubsub.createPublishIq(publish, publishOptions);
    }

    /**
     * 创建一个撤回消息的iq
     * @param node 
     * @param id 
     * @param notify 
     */
    static createRetractIq(node: string, id: string, notify?: boolean){
        return Pubsub.createRetractIq(node, id, notify);
    }
}
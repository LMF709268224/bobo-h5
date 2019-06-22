import { PlayerA } from "../PlayerA";
import { proto } from "../proto/protoGameA";
import { RoomInterfaceA } from "../RoomInterfaceA";

/**
 * 响应服务器打牌通知
 */
export namespace HandlerActionResultDiscardedA {
    export const onMsg = async (actionResultMsg: proto.pokerface.MsgActionResultNotify, room: RoomInterfaceA): Promise<void> => {
        const targetChairID = actionResultMsg.targetChairID;
        const player = <PlayerA>room.getPlayerByChairID(targetChairID);
        const discardTileIds = actionResultMsg.actionHand.cards;

        // const me = room.getMyPlayer();
        // const isMe = player.isMe();
        // if (!isMe || room.isReplayMode()) {
        //     player.discardOutTileID(discardTileId);
        // }
        // if (isMe) {

        //     return;
        // }
        for (const discardTileId of discardTileIds) {
            //从手牌移除
            player.removeTileFromHand(discardTileId);
        }
        //加到打出牌列表
        player.addDiscardedTiles(discardTileIds);

        player.sortHands();

        player.hand2UI(false);
        player.discarded2UI();
        player.showCardHandType(actionResultMsg.actionHand.cardHandType, discardTileIds[0]);
    };
}

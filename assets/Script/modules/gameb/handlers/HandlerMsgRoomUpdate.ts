import { Player } from "../Player";
import { proto } from "../proto/protoGame";
import { RoomInterface } from "../RoomInterface";

/**
 * 响应服务器更新房间
 */
export namespace HandlerMsgRoomUpdate {
    const saveScore = (room: RoomInterface, msgRoomUpdate: proto.mahjong.MsgRoomInfo): void => {
        const scoreRecords = msgRoomUpdate.scoreRecords;
        room.scoreRecords = scoreRecords;
        if (scoreRecords !== null && scoreRecords.length > 0) {
            const totalScores: number[] = [];
            totalScores[1] = 0;
            totalScores[2] = 0;
            totalScores[3] = 0;
            totalScores[4] = 0;
            for (let i = 1; i <= scoreRecords.length; i++) {
                const playerRecords = scoreRecords[i].playerRecords;
                for (let j = 1; j <= 4; j++) {
                    const playerRecord = playerRecords[j];
                    if (playerRecord !== null) {
                        const scoreNumber = playerRecord.score;
                        const userID = playerRecord.userID;
                        const player = <Player>room.getPlayerInterfaceByUserID(userID);
                        totalScores[j] = totalScores[j] + scoreNumber;
                        player.totalScores = totalScores[j];
                    }
                }
            }
        }
    };

    export const onMsg = (msgData: ByteBuffer, room: RoomInterface): void => {
        const msgRoomUpdate = proto.mahjong.MsgRoomInfo.decode(msgData);
        const msgPlayers = msgRoomUpdate.players;
        // 房间状态
        room.state = msgRoomUpdate.state;

        room.ownerID = msgRoomUpdate.ownerID;
        room.roomNumber = msgRoomUpdate.roomNumber;
        room.handStartted = msgRoomUpdate.handStartted;
        //有人退出为 -1 有人进来为 1 没有变动为 0
        let updatePlayer = 0;
        //显示房间号
        room.showRoomNumber();
        // 首先看是否有player需要被删除
        const userID2Player: { [key: string]: proto.mahjong.IMsgPlayerInfo } = {};
        const player2Remove: Player[] = [];
        for (const msgPlayer of msgPlayers) {
            userID2Player[msgPlayer.userID] = msgPlayer;
        }
        //记录需要被删除的玩家
        for (const p of room.getPlayers()) {
            const player = <Player>p;
            if (userID2Player[player.userID] === null || userID2Player[player.userID].chairID !== player.chairID) {
                player2Remove.push(player);
            }
        }
        //删除已经离开的玩家，并隐藏其视图
        for (const player of player2Remove) {
            room.removePlayer(player.chairID);
            player.unbindView();
            //有人出去
            updatePlayer = -1;
        }
        //如果自己还没有创建，创建自己
        for (const msgPlayer of msgPlayers) {
            const player = <Player>room.getPlayerInterfaceByChairID(msgPlayer.chairID);
            if (room.isMe(msgPlayer.userID)) {
                if (player === null) {
                    room.createMyPlayer(msgPlayer);
                } else if (player.chairID !== msgPlayer.chairID) {
                    room.removePlayer(player.chairID);
                    player.unbindView();
                    room.createMyPlayer(msgPlayer);
                }
                break;
            }
        }
        const me = <Player>room.getMyPlayer();
        const myOldState = me.state;
        //更新，或者创建其他player
        for (const msgPlayer of msgPlayers) {
            const player = <Player>room.getPlayerInterfaceByChairID(msgPlayer.chairID);
            if (room.isMe(msgPlayer.userID)) {
                if (player === null) {
                    room.createPlayerByInfo(msgPlayer);
                    //有人进来或者更新，更新GPS
                    if (updatePlayer === 0) {
                        updatePlayer = 1;
                    }
                } else {
                    player.updateByPlayerInfo(msgPlayer);
                }
                break;
            }
        }
        const roomStateEnum = proto.mahjong.RoomState;
        const playerStateEnum = proto.mahjong.PlayerState;
        //如果房间是等待状态，那么检查自己的状态是否已经是ready状态
        if (msgRoomUpdate.state === roomStateEnum.SRoomWaiting) {
            if (me.state !== playerStateEnum.PSReady) {
                // 显示准备按钮，以便玩家可以点击
                room.showOrHideReadyButton(true);
            } else if (myOldState !== playerStateEnum.PSReady) {
                // 并隐藏to ready按钮
                room.showOrHideReadyButton(false);
            }
        }

        //更新房间界面
        room.onUpdateStatus(msgRoomUpdate.state);

        saveScore(room, msgRoomUpdate);
        //更新用户状态到视图
        const players = room.getPlayers();
        for (const player of players) {
            const p = <Player>player;
            const onUpdate = p.playerView.onUpdateStatus[p.state];
            onUpdate(room.state);
            //显示分数
            // player.playerView:setCurScore()
            //显示房主
            p.playerView.showOwner();
        }
    };
}

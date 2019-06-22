import { Dialog, Logger, SoundMgr } from "../lobby/lcore/LCoreExports";
import { ChatData } from "../lobby/views/chat/ChatExports";
import { PlayerInfoView } from "../lobby/views/playerInfo/PlayerInfoExports";
import { AgariIndexA } from "./AgariIndexA";
import { PlayerViewA } from "./PlayerViewA";
import { proto } from "./proto/protoGameA";
import { PlayerInfo, RoomInterfaceA } from "./RoomInterfaceA";
// const playerInfoView = require "lobby/scripts/playerInfo/playerInfoView"
const pokerface = proto.pokerface;
const pokerfaceRf = proto.prunfast;
const SOUND: { [key: number]: string } = {
    [pokerfaceRf.CardHandType.Flush]: "sunzi", //顺子
    [pokerfaceRf.CardHandType.Bomb]: "zhadan", //炸弹
    [pokerfaceRf.CardHandType.Single]: "", //单张
    [pokerfaceRf.CardHandType.Pair]: "", //对子
    [pokerfaceRf.CardHandType.Pair2X]: "liandui", //连对
    [pokerfaceRf.CardHandType.Triplet]: "sange", //三张
    [pokerfaceRf.CardHandType.TripletPair]: "sandaiyi", //三带二
    [pokerfaceRf.CardHandType.Triplet2X]: "feiji", //飞机
    [pokerfaceRf.CardHandType.Triplet2X2Pair]: "feijidaicibang" //夯加飞机
};

//特效文件定义
const EFFECTS: { [key: number]: string } = {
    [pokerfaceRf.CardHandType.Flush]: "Effect_zi_hang_shunzi", //顺子
    [pokerfaceRf.CardHandType.Bomb]: "Effect_zi_hang_zhadan", //炸弹
    [pokerfaceRf.CardHandType.Single]: "", //单张
    [pokerfaceRf.CardHandType.Pair]: "", //对子
    [pokerfaceRf.CardHandType.Pair2X]: "Effect_zi_liandui", //连对
    [pokerfaceRf.CardHandType.Triplet]: "", //三张
    [pokerfaceRf.CardHandType.TripletPair]: "Effect_zi_sandaier", //三带二
    [pokerfaceRf.CardHandType.Triplet2X]: "Effect_zi_sanliandui", //飞机
    [pokerfaceRf.CardHandType.Triplet2X2Pair]: "Effect_zi_hang_feiji" //夯加飞机
};

/**
 * Player表示一个玩家，只有进入房间才会新建Player
 * 每个Player首先有其对应的牌数据（其中手牌是不公开的），然后是其对应的界面节点
 */
export class PlayerA {
    public readonly userID: string;
    public readonly chairID: number;
    public readonly host: RoomInterfaceA;
    public playerScore: proto.pokerface.IMsgPlayerScore;
    public lastTile: number;
    public tilesDiscarded: number[];
    public tilesFlower: number[];
    public tilesHand: number[];
    public tileCountInHand: number;
    public totalScores: number;
    public playerView: PlayerViewA;
    public haveR3H: boolean;
    public state: number;
    public playerInfo: PlayerInfo;
    public waitDiscardReAction: boolean;
    public readyHandList: number[];

    public allowedReActionMsg: proto.pokerface.MsgAllowPlayerReAction;
    public allowedActionMsg: proto.pokerface.MsgAllowPlayerAction;
    public isGuoHuTips: boolean;
    public tipCards: proto.pokerface.MsgCardHand[];
    public discardR2H: boolean;
    public tipCardsIndex: number;

    public constructor(userID: string, chairID: number, host: RoomInterfaceA) {
        this.userID = userID;
        this.chairID = chairID;
        this.host = host;

        this.tipCards = null;
        this.tipCardsIndex = 0;

        this.resetForNewHand();
    }

    // public isMyUserId(userID: string): boolean {
    //     return this.userID === userID;
    // }

    public resetForNewHand(): void {
        //玩家打出的牌列表
        this.tilesDiscarded = [];
        //如果玩家对象是属于当前用户的，而不是对手的
        //则有手牌列表，否则只有一个数字表示对手的手牌张数
        if (this.isMe()) {
            this.tilesHand = [];
            this.tileCountInHand = -1;
        } else {
            this.tileCountInHand = 0;
            this.tilesHand = null;
        }

        //如果视图存在，则重置视图
        if (this.playerView != null) {
            this.playerView.resetForNewHand();
        }
    }

    //player对象是当前用户的，抑或是对手的
    public isMe(): boolean {
        return this.host.isMe(this.userID);
    }

    public addHandTile(tileID: number): void {
        if (this.tilesHand != null) {
            this.tilesHand.push(tileID);
        } else {
            this.tileCountInHand = this.tileCountInHand + 1;
        }
    }

    //根据规则排序手牌
    public sortHands(): void {
        if (this.tilesHand != null) {
            this.tilesHand.sort((x: number, y: number) => {
                if (x === pokerface.CardID.R2H) {
                    return 1;
                }
                if (y === pokerface.CardID.R2H) {
                    return -1;
                }

                return x - y;
            });
        }
    }

    public addDicardedTile(tileID: number): void {
        this.tilesDiscarded = [];
        this.tilesDiscarded.push(tileID);
    }

    public addDiscardedTiles(tiles: number[]): void {
        this.tilesDiscarded = [];
        for (const t of tiles) {
            this.tilesDiscarded.push(t);
        }
    }

    //从手牌列表中删除一张牌
    //如果是对手player，则仅减少计数，因
    //对手玩家并没有手牌列表
    public removeTileFromHand(tileID: number): void {
        if (this.tilesHand != null) {
            for (let i = 0; i < this.tilesHand.length; i++) {
                if (this.tilesHand.hasOwnProperty(i)) {
                    const element = this.tilesHand[i];
                    if (element === tileID) {
                        this.tilesHand.splice(i, 1);
                        break;
                    }
                }
            }
        } else {
            this.tileCountInHand = this.tileCountInHand - 1;
        }
    }

    //从打出的牌列表中移除最后一张
    //@param tileID 最后一张牌的id，用于assert
    public removeLatestDiscarded(tileID: number): void {
        //从队列尾部删除
        const removed = this.tilesDiscarded.pop();
        if (removed !== tileID) {
            Logger.debug("llwant, removed.", removed, ",expected.", tileID);
        }
    }

    //增加多个手牌
    public addHandTiles(tiles: number[]): void {
        for (const tile of tiles) {
            this.tilesHand.push(tile);
        }
    }

    //把手牌列表显示到界面上
    //对于自己的手牌，需要排序显示，排序仅用于显示
    //排序并不修改手牌列表
    //如果房间当前是回播，则其他的人的牌也明牌显示
    public hand2UI(wholeMove: boolean): void {
        //先取消所有手牌显示
        const playerView = this.playerView;
        playerView.hideHands();
        if (this.isMe()) {
            this.playerView.showHandsForMe(wholeMove);
        } else {
            if (this.host.isReplayMode()) {
                playerView.hand2Exposed(wholeMove);
            } else {
                playerView.showHandsForOpponents(this.tileCountInHand);
            }
        }
    }

    //把牌摊开
    public hand2Exposed(): void {
        const playerView = this.playerView;
        playerView.hideHands();

        playerView.hand2Exposed(false);
    }

    //把打出的牌列表显示到界面上
    public discarded2UI(): void {
        this.playerView.showDiscarded();
    }

    public showCardHandType(cardHandType: number, discardTileId: number): void {
        const e = EFFECTS[cardHandType];
        const s = SOUND[cardHandType];
        if (e !== "") {
            this.playerView.playerOperationEffect(e);
            this.playSound("gamea", s);
        } else {
            this.playReadTileSound(discardTileId, cardHandType === pokerfaceRf.CardHandType.Pair);
        }
    }

    //播放读牌音效
    public playReadTileSound(tileID: number, isDuiZi: boolean = false): void {
        const artID = AgariIndexA.tileId2ArtId(tileID);
        const dianShu = Math.floor(artID / 4) + 2;
        let effectName = dianShu.toString();
        if (dianShu === 14) {
            effectName = "1";
        }
        if (isDuiZi) {
            effectName = `dui${effectName}`;
        }
        this.playSound("gamea", effectName);
    }

    //绑定playerView
    //主要是关联playerView，以及显示playerVIew
    public bindView(playerView: PlayerViewA): void {
        this.playerView = playerView;
        playerView.player = this;
        playerView.initCardLists();

        playerView.showPlayerInfo(this.playerInfo);
        // playerView.showOwner();
    }

    //解除绑定playerView    //主要是取消关联playerView，以及隐藏playerVIew
    public unbindView(): void {
        const playerView = this.playerView;
        if (playerView != null) {
            playerView.player = null;
            this.playerView = null;
            playerView.hideAll();
        }
    }

    public updateByPlayerInfo(playerInfo: proto.pokerface.IMsgPlayerInfo): void {
        this.state = playerInfo.state;
        this.playerInfo = new PlayerInfo(playerInfo);
    }

    //玩家选择提示 上下文必然是allowedReActionMsg
    public onTipBtnClick(): void {
        this.playerView.restoreHandPositionAndClickCount(-1);
        const handsClickCtrls = this.playerView.handsClickCtrls;
        let tipCards = this.tipCards;
        if (tipCards === undefined || tipCards === null) {
            const cards = [];
            for (const handsClickCtrl of handsClickCtrls) {
                if (handsClickCtrl.tileID !== undefined) {
                    cards.push(handsClickCtrl.tileID);
                }
            }
            let specialCardID = -1;
            if (this.discardR2H) {
                specialCardID = 1;
            }
            if (this.allowedReActionMsg === null) {
                //提示  自己的出牌提示
                tipCards = AgariIndexA.searchLongestDiscardCardHand(cards, specialCardID);
            } else {
                const prevActionHand = this.allowedReActionMsg.prevActionHand;
                tipCards = AgariIndexA.findAllGreatThanCardHands(prevActionHand, cards, specialCardID);
            }
            this.tipCards = tipCards;
        }
        if (tipCards.length === 0) {
            //如果提示没东西，则帮用户
            // Dialog.prompt("如果提示没东西，则帮用户");
            this.onSkipBtnClick();

            return;
        }
        if (this.tipCardsIndex >= tipCards.length) {
            this.tipCardsIndex = 0;
        }
        const tipCard = tipCards[this.tipCardsIndex];
        this.tipCardsIndex = this.tipCardsIndex + 1;
        if (tipCard !== undefined && tipCard !== null) {
            const cs = tipCard.cards;
            if (cs !== undefined && cs.length > 0) {
                for (let i = 0; i < handsClickCtrls.length; i++) {
                    const handsClickCtrl = handsClickCtrls[i];
                    const tileID = handsClickCtrl.tileID;
                    if (tileID !== undefined) {
                        for (const c of cs) {
                            if (c === tileID) {
                                this.playerView.moveHandUp(i);
                            }
                        }
                    }
                }
            }
        }
    }

    //玩家选择出牌
    public onDiscardBtnClick(): void {
        //出牌逻辑
        const handsClickCtrls = this.playerView.handsClickCtrls;
        const discardCards = [];
        for (const handsClickCtrl of handsClickCtrls) {
            if (handsClickCtrl.tileID !== undefined && handsClickCtrl.tileID !== null) {
                if (handsClickCtrl.clickCount === 1) {
                    discardCards.push(handsClickCtrl.tileID);
                }
            }
        }
        this.onPlayerDiscardCards(discardCards);
    }

    //玩家选择了过
    public onSkipBtnClick(): void {
        const actionMsg = new proto.pokerface.MsgPlayerAction();
        actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
        actionMsg.action = pokerfaceRf.ActionType.enumActionType_SKIP;

        this.sendActionMsg(actionMsg);
        this.playerView.clearAllowedActionsView();
        //重置手牌位置
        this.playerView.restoreHandsPositionAndClickCount(-1);
    }

    //执行自动打牌操作
    public autoDiscard(): void {
        if (this.allowedActionMsg !== null) {
            const disCards = [pokerface.CardID.R2H];
            this.onPlayerDiscardCards(disCards);
        }
    }

    public hideDiscarded(): void {
        this.playerView.hideDiscarded();
    }
    public onPlayerDiscardCards(tileIDs: number[]): void {
        //const host = this.host
        if (tileIDs.length === 0) {
            //提示没有选中牌
            Dialog.prompt("没有选中牌");

            return;
        }
        const actionMsg = new proto.pokerface.MsgPlayerAction();
        let r3h = false;
        Logger.debug("tileIDs === :", tileIDs);
        const current = AgariIndexA.agariConvertMsgCardHand(tileIDs);
        if (current === null) {
            Logger.debug("current === :", current);

            return;
        }
        actionMsg.cards = [];
        for (const card of tileIDs) {
            if (card === pokerface.CardID.R3H) {
                r3h = true;
            }
            actionMsg.cards.push(card);
        }
        actionMsg.action = pokerfaceRf.ActionType.enumActionType_DISCARD;
        if (this.allowedActionMsg !== null) {
            actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
            if (this.haveR3H) {
                //此时必须出 红桃3
                if (!r3h) {
                    //提示必须出 红桃3
                    Dialog.prompt("必须出 红桃3");

                    return;
                }
                this.haveR3H = false;
            }
        }
        if (this.allowedReActionMsg !== null) {
            actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
            const prevActionHand = this.allowedReActionMsg.prevActionHand;
            if (this.discardR2H) {
                //此时必须出2
                if (tileIDs.length !== 1 || tileIDs[0] !== pokerface.CardID.R2H) {
                    //提示此时必须出2
                    Dialog.prompt("必须出2");

                    return;
                }
                this.discardR2H = false;
            }
            if (!AgariIndexA.agariGreatThan(prevActionHand, current)) {
                Dialog.prompt("您的牌不够大");

                return;
            }
        }
        this.sendActionMsg(actionMsg);
        this.playerView.clearAllowedActionsView();
    }

    /**
     * name
     */
    public getPlayInfo(): PlayerInfo {
        return this.playerInfo;
    }

    public onChatMsg(chatData: ChatData): void {
        if (chatData.buildinId !== undefined && chatData.buildinId !== "") {
            //播放快捷语音效
            this.playSound("commonLanguage", `speak${chatData.buildinId}`);
        }
        this.playerView.showChatMsg(chatData.msg);
    }
    public onPlayerInfoClick(): void {
        // const pos = { x = this.playerView.userInfoPos.x, y = this.playerView.userInfoPos.y }
        // playerInfoView.showUserInfoView(this.playerInfo, pos, this.isMe() == false, this.host)

        const pos = new cc.Vec2(this.playerView.getUserInfoPos().x, this.playerView.getUserInfoPos().y);
        // const pos = new cc.Vec2(0, 0);
        // const playerInfoString = JSON.stringify(this.playerInfo);
        // playerInfoView.showUserInfoView(self.playerInfo, pos, self:isMe() == false)

        const roomHost = this.host.getRoomHost();
        if (roomHost === null) {
            Logger.debug("roomHost === null");
        }

        let playerInfoView = roomHost.component.getComponent(PlayerInfoView);
        if (playerInfoView === null) {
            playerInfoView = roomHost.component.addComponent(PlayerInfoView);
        }

        playerInfoView.showUserInfoView(roomHost.getLobbyModuleLoader(), this.host, this.playerInfo, pos, this.isMe() === false);
    }
    public playSkipAnimation(): void {
        this.playerView.playerOperationEffect("Effect_zi_buyao");
        this.playSound("gamea", "buyao");
    }

    private playSound(directory: string, effectName: string): void {
        let soundName = "";
        if (this.playerInfo.gender === 1) {
            soundName = `${directory}/boy/boy_${effectName}`;
        } else {
            soundName = `${directory}/girl/girl_${effectName}`;
        }
        SoundMgr.playEffectAudio(soundName);
    }

    private sendActionMsg(actionMsg: proto.pokerface.MsgPlayerAction): void {
        const actionMsgBuf = proto.pokerface.MsgPlayerAction.encode(actionMsg);
        this.host.sendActionMsg(actionMsgBuf);
    }
}

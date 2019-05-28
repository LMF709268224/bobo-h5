import { Logger } from "../lobby/lcore/LCoreExports";
import { PlayerView } from "./PlayerView";
import { proto } from "./proto/protoGame";
import { MeldType, PlayerInfo, RoomInterfaces } from "./RoomInterfaces";
// const playerInfoView = require "lobby/scripts/playerInfo/playerInfoView"
const mjproto = proto.mahjong;
const enum SoundDef {

    Chow = "chi",
    Pong = "peng",
    Kong = "gang",
    Ting = "ting",
    WinChuck = "hu", //被点炮
    WinDraw = "zimo", //自摸
    Common = "effect_common"
}

//特效文件定义
const enum EffectsDef {
    Chow = "Effects_zi_chi",
    Pong = "Effects_zi_peng",
    Kong = "Effects_zi_gang",
    Ting = "ting",
    WinChuck = "Effrcts_zi_dianpao", //被点炮
    WinDraw = "Effects_zi_zimo", //自摸
    DrawCard = "Effects_zi_zhua"
}

/**
 * Player表示一个玩家，只有进入房间才会新建Player
 * 每个Player首先有其对应的牌数据（其中手牌是不公开的），然后是其对应的界面节点
 */
export class Player {
    public readonly userID: string;
    public readonly chairID: number;
    public readonly host: RoomInterfaces;

    public tilesDiscarded: number[];
    public melds: MeldType[];
    public tilesFlower: number[];
    public tilesHand: number[];
    public isRichi: boolean;
    public tileCountInHand: number;
    public playerView: PlayerView;
    //设置一个标志，表示已经点击了动作按钮（吃碰杠胡过）
    public waitSkip: boolean;

    public state: number;
    public playerInfo: PlayerInfo;
    public waitDiscardReAction: boolean;
    public readyHandList: number[];

    private allowedReActionMsg: proto.mahjong.MsgAllowPlayerReAction;
    private allowedActionMsg: proto.mahjong.MsgAllowPlayerAction;

    private flagsTing: boolean;
    private isGuoHuTips: boolean;
    public constructor(userID: string, chairID: number, host: RoomInterfaces) {
        this.userID = userID;
        this.chairID = chairID;
        this.host = host;

        this.resetForNewHand();

    }

    public isMyUserId(userID: string): boolean {
        return this.userID === userID;
    }

    public resetForNewHand(): void {
        //玩家打出的牌列表
        this.tilesDiscarded = [];
        //玩家的面子牌组列表
        this.melds = [];
        //玩家的花牌列表
        this.tilesFlower = [];

        //是否起手听牌
        //TODO. 当玩家起手听牌时，当仅仅可以打牌操作时，自动打牌
        this.isRichi = false;

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

    ////////////////////////////////////
    //player对象是当前用户的，抑或是对手的
    ////////////////////////////////////
    public isMe(): boolean {
        return this.host.isMe(this);
    }

    public addHandTile(tileID: number): void {
        if (this.tilesHand != null) {
            this.tilesHand.push(tileID);
        } else {
            this.tileCountInHand = this.tileCountInHand + 1;
        }
    }

    //////////////////////////////////////-
    //根据规则排序手牌
    //////////////////////////////////////-
    public sortHands(excludeLast: boolean): void {
        if (this.tilesHand != null) {
            let last: number;
            if (excludeLast) {
                last = this.tilesHand.pop();
            }
            this.tilesHand.sort((x: number, y: number) => {
                return x - y;
            });
            if (excludeLast) {
                this.tilesHand.push(last);
            }
        }
    }

    public addDicardedTile(tileID: number): void {
        this.tilesDiscarded.push(tileID);
    }

    public addDiscardedTiles(tiles: number[]): void {
        for (const t of tiles) {
            this.tilesDiscarded.push(t);
        }
    }

    ////////////////////////////////////
    //从手牌列表中删除一张牌
    //如果是对手player，则仅减少计数，因
    //对手玩家并没有手牌列表
    ////////////////////////////////////
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

    ////////////////////////////////////
    //从打出的牌列表中移除最后一张
    //@param tileID 最后一张牌的id，用于assert
    ////////////////////////////////////
    public removeLatestDiscarded(tileID: number): void {
        //从队列尾部删除

        const removed = this.tilesDiscarded.pop();
        if (removed !== tileID) {
            Logger.debug("llwant, removed.", removed, ",expected.", tileID);
        }
    }

    ////////////////////////////////////
    //新增花牌
    //@param tiles 新增加的花牌列表
    ////////////////////////////////////
    public addFlowerTiles(tiles: number[]): void {
        for (const tile of tiles) {
            this.tilesFlower.push(tile);
        }
    }

    ////////////////////////////////////
    //增加多个手牌
    ////////////////////////////////////
    public addHandTiles(tiles: number[]): void {
        for (const tile of tiles) {
            this.tilesHand.push(tile);
        }
    }

    ////////////////////////////////////
    //增加一个落地面子牌组
    ////////////////////////////////////
    public addMeld(meld: MeldType): void {
        //插入到队列尾部
        this.melds.push(meld);
    }

    ////////////////////////////////////
    //利用服务器发下来的暗杠牌组的id列表（明牌）
    //更新本地的暗杠牌组列表
    ////////////////////////////////////
    public refreshConcealedMelds(concealedKongIDs: number[]): void {
        let i = 1;
        for (const m of this.melds) {
            if (m.meldType === mjproto.MeldType.enumMeldTypeConcealedKong) {
                m.tile1 = concealedKongIDs[i];
                i = i + 1;
            }
        }
    }

    ////////////////////////////////////
    //增加多个落地面子牌组
    ////////////////////////////////////
    public addMelds(melds: MeldType[]): void {
        for (const v of melds) {
            this.melds.push(v);
        }
    }

    ////////////////////////////////////
    //获取一个落地面子牌组
    ////////////////////////////////////
    public getMeld(tileID: number, meldType: number): MeldType {
        for (const v of this.melds) {
            if (v.tile1 === tileID && v.meldType === meldType) {
                return v;
            }
        }

        return null;
    }

    ////////////////////////////////////
    //把手牌列表显示到界面上
    //对于自己的手牌，需要排序显示，排序仅用于显示
    //排序并不修改手牌列表
    //如果房间当前是回播，则其他的人的牌也明牌显示
    ////////////////////////////////////
    public hand2UI(wholeMove: boolean): void {
        //先取消所有手牌显示
        const playerView = this.playerView;
        playerView.hideHands();
        if (this.isMe()) {
            this.showHandsForMe(wholeMove);
        } else {
            if (this.host.isReplayMode()) {
                playerView.hand2Exposed(wholeMove, this.melds, this.tilesHand);
            } else {
                playerView.showHandsForOpponents(this.tileCountInHand, this.melds);
            }
        }
    }

    public showHandsForMe(wholeMove: boolean): void {
        this.playerView.showHandsForMe(wholeMove, this.tilesHand, this.melds, this.isRichi);
    }
    ////////////////////////////////////
    //把牌摊开
    ////////////////////////////////////
    public hand2Exposed(): void {
        const playerView = this.playerView;
        playerView.hideHands();

        playerView.hand2Exposed(false, this.melds, this.tilesHand);
    }

    ////////////////////////////////////
    //把花牌列表显示到界面上
    ////////////////////////////////////
    public flower2UI(): void {
        //先取消所有花牌显示
        const playerView = this.playerView;
        playerView.hideFlowers();

        playerView.showFlowers(this.tilesFlower);
    }

    ////////////////////////////////////
    //把打出的牌列表显示到界面上
    ////////////////////////////////////
    public discarded2UI(newDiscard: boolean, waitDiscardReAction: boolean): void {
        this.playerView.showDiscarded(newDiscard, waitDiscardReAction, this.tilesDiscarded);
    }

    ////////////////////////////////////
    //隐藏打出的牌提示
    ////////////////////////////////////
    public hideDiscardedTips(): void {
        if (!this.waitDiscardReAction) {
            return;
        }
        this.waitDiscardReAction = false;
        const discardTips = this.playerView.discardTips;
        discardTips.visible = false;
    }

    ////////////////////////////////////
    //听牌标志
    ////////////////////////////////////
    public richiIconShow(showOrHide: boolean): void {
        this.isRichi = showOrHide;
        const playerView = this.playerView;
        playerView.head.ting.visible = showOrHide;
    }
    ////////////////////////////////////
    //播放吃牌动画
    ////////////////////////////////////
    public chowResultAnimation(): void {
        if (this.isMe()) {
            //隐藏牌组
            this.playerView.hideHands();
            this.showHandsForMe(true);
        }

        //播放对应音效
        this.playOperationSound(SoundDef.Chow);
        this.playerView.playerOperationEffect(EffectsDef.Chow, false);
    }

    ////////////////////////////////////
    //播放碰牌动画
    ////////////////////////////////////
    public pongResultAnimation(): void {
        if (this.isMe()) {
            //隐藏牌组
            this.playerView.hideHands();
            this.showHandsForMe(true);
        }

        //播放对应音效
        this.playOperationSound(SoundDef.Pong);
        this.playerView.playerOperationEffect(EffectsDef.Pong, false);
    }

    ////////////////////////////////////
    //播放明杠动画
    ////////////////////////////////////
    public exposedKongResultAnimation(): void {
        if (this.isMe()) {
            //隐藏牌组
            this.playerView.hideHands();
            this.showHandsForMe(true);
        }

        //播放对应音效
        this.playOperationSound(SoundDef.Kong);
        this.playerView.playerOperationEffect(EffectsDef.Kong, false);
    }

    ////////////////////////////////////
    //播放暗杠动画
    ////////////////////////////////////
    public concealedKongResultAnimation(): void {
        if (this.isMe()) {
            //隐藏牌组
            this.playerView.hideHands();
            this.showHandsForMe(true);
        }

        //播放对应音效
        this.playOperationSound(SoundDef.Kong);
        this.playerView.playerOperationEffect(EffectsDef.Kong, false);
    }

    ////////////////////////////////////
    //播放加杠动画
    ////////////////////////////////////
    public triplet2KongResultAnimation(): void {
        if (this.isMe()) {
            //隐藏牌组
            this.playerView.hideHands();
            this.showHandsForMe(true);
        }

        //播放对应音效
        this.playOperationSound(SoundDef.Kong);
        this.playerView.playerOperationEffect(EffectsDef.Kong, false);
    }

    ////////////////////////////////////
    //播放抓牌
    ////////////////////////////////////
    public playZhuaPaiAnimation(): void {
        if (this.isMe()) {
            //隐藏牌组
            this.playerView.hideHands();
            this.showHandsForMe(true);
        }
        //播放对应音效
        // this.playOperationSound(SoundDef.DrawCard)
        this.playerView.playerOperationEffect(EffectsDef.DrawCard, false);
    }

    ////////////////////////////////////
    //播放自摸
    ////////////////////////////////////
    public playZiMoAnimation(): void {
        //播放对应音效
        this.playOperationSound(SoundDef.WinDraw);
        //自摸, 1, 3 位置的玩家播放zimo1, 2, 4位置的玩家播放zimo2
        //const effect = dfConfig.EFF_DEFINE.SUB_ZI_ZIMO.. "1"
        // if this.playerView.viewChairID == 2 or this.playerView.viewChairID == 4 {
        //effect = dfConfig.EFF_DEFINE.SUB_ZI_ZIMO.. "2"
        //}
        this.playerView.playerOperationEffect(EffectsDef.WinDraw, false);
    }

    ////////////////////////////////////
    //播放点炮
    ////////////////////////////////////
    public playDianPaoAnimation(): void {
        //播放对应音效
        this.playOperationSound(SoundDef.WinChuck);
        this.playerView.playerOperationEffect(EffectsDef.WinChuck, false);
    }

    ////////////////////////////////////
    //播放吃铳
    ////////////////////////////////////
    public playChiChongAnimation(): void {
        //播放对应音效
        //this. playOperationSound(SoundDef.WinChuck)
        //this.playerView. playerOperationEffect(dfConfig.EFF_DEFINE.SUB_ZI_HU)
    }

    ////////////////////////////////////
    //播放起手听牌特效
    ////////////////////////////////////
    public readyHandEffect(): void {
        //播放对应音效
        //TODO. 没有这个音效，暂时注销 by陈日光
        this.playOperationSound(SoundDef.Ting);
        this.playerView.playReadyHandEffect();
    }

    ////////////////////////////////////
    //播放读牌音效
    ////////////////////////////////////
    public playReadTileSound(): void {
        //const index = agariIndex.tileId2ArtId(tileID)
        //const id = tonumber(index)
        // if id >= 51 && id <= 58 {
        //this. playSound("operate", "hua")
        // else
        //const effectName = "tile"..id
        //     if id == 11 {
        //math.newrandomseed()
        //effectName = string.format("tile%d_%d", id, math.random(1, 2, 3))
        //else if id == 29 {
        //math.newrandomseed()
        //effectName = string.format("tile%d_%d", id, math.random(1, 2))
        //}
        //this. playSound("tile", effectName)
        //}
    }

    ////////////////////////////////////
    //播放吃碰杠胡听音效
    ////////////////////////////////////
    public playOperationSound(str: string): void {
        Logger.debug("播放吃碰杠胡听音效: ", str);
        //const soundName = ""
        // if this.sex == 1 {
        //soundName = directory.. "/boy/"..effectName
        // else
        //soundName = directory.. "/girl/"..effectName
        //}
        //dfCompatibleAPI. soundPlay(soundName)
        //执行音效
        //dfCompatibleAPI. soundPlay("effect/"..SoundDef.Common)
    }

    ////////////////////////////////////
    //绑定playerView
    //主要是关联playerView，以及显示playerVIew
    ////////////////////////////////////
    public bindView(playerView: PlayerView): void {
        this.playerView = playerView;
        playerView.player = this;
        playerView.initCardLists();
        // if this.nick != null {
        //playerView.head.nameText.text = ""..this.nick
        //}

        //playerView.head.root.visible = true
        //playerView.tilesRoot.visible = true

        playerView.showHeadImg();
        playerView.showOwner();
    }

    ////////////////////////////////////
    //解除绑定playerView
    //主要是取消关联playerView，以及隐藏playerVIew
    ////////////////////////////////////
    public unbindView(): void {
        const playerView = this.playerView;
        if (playerView != null) {
            playerView.player = null;
            this.playerView = null;
            playerView.hideAll();
        }
    }

    public updateByPlayerInfo(playerInfo: PlayerInfo): void {
        //TODO. 更新用户状态
        // const player = this
        // player.sex = playerInfo.sex
        // player.headIconURI = playerInfo.headIconURI
        // player.ip = playerInfo.ip
        // player.location = playerInfo.location
        // player.dfHands = playerInfo.dfHands
        // player.diamond = playerInfo.diamond
        // player.charm = playerInfo.charm
        // player.avatarID = playerInfo.avatarID
        // if this. isMe() && not this.host. isReplayMode() {
        //const singleton = acc
        //singleton.charm = playerInfo.charm
        //g_dataModule. GetUserData(). SetCharm(playerInfo.charm)
        //}
        this.state = playerInfo.state;
        this.playerInfo = playerInfo;
    }

    public discardOutTileID(tileID: number): void {
        //从手牌移除
        this.removeTileFromHand(tileID);

        //排一下序, sortHands会根据tilesHand表格是否为nil，做出排序选择
        this.sortHands(false);

        //更新UI
        this.hand2UI(false);

        //出牌音效
        //dfCompatibleAPI. soundPlay("effect/effect_chupai")
        //播放读牌音效
        // if dfCompatibleAPI. soundGetToggle("readPaiIsOn") {
        //this. playReadTileSound(tileID)
        //}
    }

    public myDiscardAction(tileID: number): void {
        this.discardOutTileID(tileID);
        this.playerView.enlargeDiscarded(tileID, true);
    }

    public onBankerReadyHandClicked(): boolean {
        //检查是否选择了牌打出去
        const handsClickCtrls = this.playerView.handsClickCtrls;
        for (let i = 1; i < 14; i++) {
            const clickCtrl = handsClickCtrls[i];
            if (clickCtrl.clickCount === 1) {
                //检查选择了的牌是否可以听
                if (clickCtrl.readyHandList != null && clickCtrl.readyHandList.length > 0) {
                    //如果此牌可以听
                    //发送打牌的消息包，把flag设置1，服务器就知道庄家选择了打牌并且听牌
                    const actionMsg = new proto.mahjong.MsgPlayerAction();
                    actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
                    actionMsg.action = mjproto.ActionType.enumActionType_DISCARD;
                    actionMsg.tile = clickCtrl.tileID;
                    actionMsg.flags = 1;

                    //修改：出牌后立即放大打出的牌，一直等待服务器的回复
                    this.myDiscardAction(clickCtrl.tileID);

                    const tipsForAction = this.allowedActionMsg.tipsForAction;
                    for (const t of tipsForAction) {
                        if (t.targetTile === clickCtrl.tileID) {
                            const readyHandList = t.readyHandList;
                            this.updateReadyHandList(readyHandList);
                            break;
                        }
                    }
                    this.sendActionMsg(actionMsg);

                    return true;
                } else {
                    //TODA 请选择一张可听的牌
                    //logError("请选择一张可听的牌")
                    //dfCompatibleAPI. showTip("请选择一张可听的牌")
                    return false;
                }

                // return false
            }
        }

        return false;
    }

    ////////////////////////////////////////
    //玩家选择了起手听牌   （选择“听”按钮// > 隐藏所有动作按钮// > 不可听的牌灰度处理// > 接下来打出的牌就是听牌）
    //上下文必然是allowedActionMsg
    ////////////////////////////////////////
    public onReadyHandBtnClick(): void {
        //隐藏所有动作按钮
        this.playerView.hideOperationButtons();

        if (this.host.getBankerChairID() === this.chairID) {
            //庄家起手听
            //不可听的牌灰度处理
            const handsClickCtrls = this.playerView.handsClickCtrls;
            for (let i = 1; i < 14; i++) {
                const handsClickCtrl = handsClickCtrls[i];
                const tileID = handsClickCtrl.tileID;
                if (tileID != null) {
                    handsClickCtrl.isDiscardable = handsClickCtrl.t.visible;
                    if (!handsClickCtrl.t.visible) {
                        handsClickCtrl.isGray = true;
                        this.playerView.setGray(handsClickCtrl.h);
                    }
                }
            }
            //设置一个标志，接下来打牌就看这个标志
            this.flagsTing = true;
            //设置一个标志，表示已经点击了动作按钮（吃碰杠胡过）
            this.waitSkip = false;
        } else {
            //玩家起手听
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_FirstReadyHand;
            actionMsg.flags = 1; //0表示不起手听牌

            this.sendActionMsg(actionMsg);
        }
    }

    public onFinalDrawBtnClick(): void {
        //const host = this.host
        if (this.allowedActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_CustomB;
            this.sendActionMsg(actionMsg);
        }

        this.playerView.clearAllowedActionsView(false);
    }

    ////////////////////////////////////////
    //玩家选择了吃牌
    //上下文必然是allowedReActionMsg
    ////////////////////////////////////////
    public onChowBtnClick(): void {
        //const host = this.host
        if (this.allowedReActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_CHOW;

            //必然只有一个可以碰的面子牌组
            //TODO. 吃牌可以有多种吃法
            const ss = this.allowedReActionMsg.meldsForAction;
            const chowMelds = this.selectMeldFromMeldsForAction(ss, mjproto.MeldType.enumMeldTypeSequence, actionMsg);
            //logger.debug("chowMelds . ", chowMelds)
            actionMsg.tile = this.allowedReActionMsg.victimTileID;
            if (chowMelds.length > 1) {
                this.host.showOrHideMeldsOpsPanel(chowMelds);
            } else {
                actionMsg.meldType = chowMelds[1].meldType;
                actionMsg.meldTile1 = chowMelds[1].tile1;
                this.sendActionMsg(actionMsg);
            }
        }
        this.playerView.clearAllowedActionsView(false);
    }

    ////////////////////////////////////////
    //玩家选择了碰牌
    //上下文必然是allowedReActionMsg
    ////////////////////////////////////////
    public onPongBtnClick(): void {
        //const host = this.host

        if (this.allowedReActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_PONG;

            //必然只有一个可以碰的面子牌组
            const ss = this.allowedReActionMsg.meldsForAction;
            const pongMelds = this.selectMeldFromMeldsForAction(ss, mjproto.MeldType.enumMeldTypeTriplet, actionMsg);
            actionMsg.tile = this.allowedReActionMsg.victimTileID;
            actionMsg.meldType = pongMelds[1].meldType;
            actionMsg.meldTile1 = pongMelds[1].tile1;

            this.sendActionMsg(actionMsg);
        }

        this.playerView.clearAllowedActionsView(false);
    }

    ////////////////////////////////////////
    //玩家选择了杠牌
    //当上下文是allowedActionMsg时，表示加杠或者暗杠
    //当上下文是allowedReActionMsg时，表示明杠
    ////////////////////////////////////////
    public onKongBtnClick(): void {
        //const host = this.host

        if (this.allowedActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            //确定是加杠还是暗杠
            // if proto.actionsHasAction(this.allowedActionMsg.allowedActions, mjproto.enumActionType_KONG_Concealed) {
            //action = mjproto.enumActionType_KONG_Concealed
            //}
            actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
            const ss = this.allowedActionMsg.meldsForAction;
            const kConcealed = this.selectMeldFromMeldsForAction(ss, mjproto.MeldType.enumMeldTypeConcealedKong, actionMsg);
            const kongTriplet2 = this.selectMeldFromMeldsForAction(ss, mjproto.MeldType.enumMeldTypeTriplet2Kong, actionMsg);
            const kongs = [];
            let action = mjproto.ActionType.enumActionType_KONG_Triplet2;
            if (kConcealed.length > 0) {
                action = mjproto.ActionType.enumActionType_KONG_Concealed;
                for (const v of kConcealed) {
                    kongs.push(v);
                }
            }
            if (kongTriplet2.length > 0) {
                for (const v of kongTriplet2) {
                    kongs.push(v);
                }
            }

            if (kongs.length > 1) {
                this.host.showOrHideMeldsOpsPanel(kongs);
            } else {
                actionMsg.action = action;
                //无论是加杠，或者暗杠，肯定只有一个面子牌组
                actionMsg.tile = kongs[1].tile1;
                actionMsg.meldType = kongs[1].meldType;
                actionMsg.meldTile1 = kongs[1].tile1;
                this.sendActionMsg(actionMsg);
            }
        } else if (this.allowedReActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_KONG_Exposed;

            //必然只有一个可以明杠的牌组
            const ss = this.allowedReActionMsg.meldsForAction;
            const kMelds = this.selectMeldFromMeldsForAction(ss, mjproto.MeldType.enumMeldTypeExposedKong, actionMsg);
            actionMsg.tile = this.allowedReActionMsg.victimTileID;
            actionMsg.meldType = kMelds[1].meldType;
            actionMsg.meldTile1 = kMelds[1].tile1;

            this.sendActionMsg(actionMsg);
        }

        this.playerView.clearAllowedActionsView(false);
    }
    public selectMeldFromMeldsForAction(ms: proto.mahjong.IMsgMeldTile[], ty: number, msg: proto.mahjong.MsgPlayerAction): MeldType[] {
        const r: MeldType[] = [];
        for (const m of ms) {
            if (m.meldType === ty) {
                const nn = new MeldType();
                nn.actionMsg = msg;
                nn.meldType = m.meldType;
                nn.tile1 = m.tile1;
                nn.chowTile = m.chowTile;
                nn.contributor = m.contributor;
                r.push(nn);
            }
        }

        return r;
    }

    ////////////////////////////////////////
    //玩家选择了胡牌
    //当上下文是allowedActionMsg时，表示自摸胡牌
    //当上下文是allowedReActionMsg时，表示吃铳胡牌
    ////////////////////////////////////////
    public onWinBtnClick(): void {
        //const host = this.host

        if (this.allowedActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_WIN_SelfDrawn;

            this.sendActionMsg(actionMsg);
        } else if (this.allowedReActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_WIN_Chuck;
            actionMsg.tile = this.allowedReActionMsg.victimTileID;

            this.sendActionMsg(actionMsg);
        }

        this.playerView.clearAllowedActionsView(false);
    }

    ////////////////////////////////////////
    //玩家选择了过
    //当上下文是allowedActionMsg时，表示不起手听牌
    //当上下文是allowedReActionMsg时，表示不吃椪杠胡
    ////////////////////////////////////////
    public onSkipBtnClick(): void {
        //const playerView = this.playerView
        if (this.isGuoHuTips) {
            //dfCompatibleAPI. showTip("可胡牌时，需要点击2次过才可过牌。")
            //提示完成，设置开关为true
            this.isGuoHuTips = false;
        } else {
            let discardAble = false;
            if (this.allowedActionMsg != null) {
                const allowedActions = this.allowedActionMsg.allowedActions;
                discardAble = true;
                if ((allowedActions & mjproto.ActionType.enumActionType_FirstReadyHand) !== 0) {
                    if (this.host.getBankerChairID() !== this.chairID) {
                        const actionMsg = new proto.mahjong.MsgPlayerAction();
                        actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
                        //这里action换成enumActionType_FirstReadyHand而不是skip
                        actionMsg.action = mjproto.ActionType.enumActionType_FirstReadyHand;
                        actionMsg.flags = 0; //0表示不起手听牌

                        this.sendActionMsg(actionMsg);
                        discardAble = false;
                    }
                } else if ((allowedActions & mjproto.ActionType.enumActionType_SKIP) !== 0) {
                    if ((allowedActions & mjproto.ActionType.enumActionType_DISCARD) === 0) {
                        const actionMsg = new proto.mahjong.MsgPlayerAction();
                        actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
                        actionMsg.action = mjproto.ActionType.enumActionType_SKIP;

                        this.sendActionMsg(actionMsg);

                        discardAble = false;
                    }
                }
            } else if (this.allowedReActionMsg != null) {
                const actionMsg = new proto.mahjong.MsgPlayerAction();
                actionMsg.qaIndex = this.allowedReActionMsg.qaIndex;
                actionMsg.action = mjproto.ActionType.enumActionType_SKIP;

                this.sendActionMsg(actionMsg);
            }

            this.playerView.clearAllowedActionsView(discardAble);
            //重置手牌位置
            this.playerView.restoreHandPositionAndClickCount(-1);
            //设置一个标志，表示已经点击了动作按钮（吃碰杠胡过）
            this.waitSkip = false;
        }
    }

    public sendActionMsg(actionMsg: proto.mahjong.MsgPlayerAction): void {
        const actionMsgBuf = proto.mahjong.MsgPlayerAction.encode(actionMsg);
        this.host.sendActionMsg(actionMsgBuf);
    }

    //////////////////////////////////////////////////////////-
    //执行自动打牌操作
    //////////////////////////////////////////////////////////-
    public autoDiscard(): void {
        if (this.allowedActionMsg != null) {
            //自己摸牌的情况下
            const actions = this.allowedActionMsg.allowedActions;
            //如果可以自摸胡牌
            //不再自动胡牌，考虑到如果可以胡，可以过，如果帮助用户选择胡可能不是最优选择
            if ((actions & mjproto.ActionType.enumActionType_WIN_SelfDrawn) !== 0) {
                //this. onWinBtnClick(this.playerView.winBtn)
                //可以胡牌，得返回，让用户自己处理
                return;
            }
            //如果不可以胡牌
            const discarAbleTiles = this.allowedActionMsg.tipsForAction;
            if (discarAbleTiles.length === 1) {
                //当且仅当可出牌数为1的时候，才能执行自动打牌
                const discarAbleTile = discarAbleTiles[1];
                const tileID = discarAbleTile.targetTile;
                this.onPlayerDiscardTile(tileID);
                this.playerView.clearAllowedActionsView(false);
            }
        }

        // if this.allowedReActionMsg != null {
        //当有可以吃碰杠胡的情况
        //自动打牌只处理可以胡的情况，考虑到如果可以胡，可以过，如果帮助用户选择胡可能不是最优选择
        //const actions = this.allowedReActionMsg.allowedActions
        // if proto.actionsHasAction(actions, mjproto.enumActionType_WIN_Chuck) {
        //this. onWinBtnClick(this.playerView.winBtn)
        //}
        //}
    }

    public onPlayerDiscardTile(tileID: number): boolean {
        //const host = this.host
        if (this.allowedActionMsg != null) {
            const actionMsg = new proto.mahjong.MsgPlayerAction();
            actionMsg.qaIndex = this.allowedActionMsg.qaIndex;
            actionMsg.action = mjproto.ActionType.enumActionType_DISCARD;
            actionMsg.tile = tileID;
            if (this.flagsTing) {
                actionMsg.flags = 1;
                this.flagsTing = false;
            }
            this.sendActionMsg(actionMsg);
            //修改：出牌后立即放大打出的牌，一直等待服务器的回复
            this.myDiscardAction(tileID);

            const tipsForAction = this.allowedActionMsg.tipsForAction;
            for (const t of tipsForAction) {
                if (t.targetTile === tileID) {
                    const readyHandList = t.readyHandList;
                    this.updateReadyHandList(readyHandList);
                    break;
                }
            }
        }

        return true;
    }

    public updateReadyHandList(readyHandList: number[]): void {
        this.readyHandList = readyHandList;
        if (this.readyHandList != null && this.readyHandList.length > 0) {
            this.playerView.checkReadyHandBtn.visible = true;
        } else {
            this.playerView.checkReadyHandBtn.visible = false;
        }
    }

    public onPlayerInfoClick(): void {
        // const pos = { x = this.playerView.userInfoPos.x, y = this.playerView.userInfoPos.y }
        // playerInfoView.showUserInfoView(this.playerInfo, pos, this.isMe() == false, this.host)
    }
}
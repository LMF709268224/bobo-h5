import { RoomHost } from "../lobby/interface/LInterfaceExports";
import { CommonFunction, Logger } from "../lobby/lcore/LCoreExports";
import { ClickCtrl, PlayerInterfaceA } from "./PlayerInterfaceA";
import { proto } from "./proto/protoGameA";
import { PlayerInfo, RoomInterfaceA } from "./RoomInterfaceA";
import { TileImageMounterA } from "./TileImageMounterA";

const pokerface = proto.pokerface;

/**
 * playerview对应玩家的视图，牌桌上有4个playerview
 */
class PosCtrl {
    public x: number;
    public y: number;
    public constructor(x: number, y: number) {
        this.y = y;
        this.x = x;
    }
}

/**
 * 保存头像节点
 */
class Head {
    public headView: fgui.GComponent;
    public headLoader: fgui.GLoader;
    public pos: fgui.GObject;
    public readyIndicator: fgui.GObject;
    public roomOwnerFlag: fgui.GObject;
    // public nameText: fgui.GObject;
    public hideAll: Function;
}

/**
 * 玩家
 */
export class PlayerViewA {
    public handsClickCtrls: ClickCtrl[];
    public player: PlayerInterfaceA;
    public room: RoomInterfaceA;
    public head: Head;
    public viewChairID: number;
    public onUpdateStatus: Function[];
    public skipBtn: fgui.GButton;
    public tipBtn: fgui.GButton;
    public discardBtn: fgui.GButton;
    private operationPanel: fgui.GComponent;
    private discards: fgui.GComponent[];
    private lights: fgui.GComponent[];
    private handsMe: fgui.GComponent[];
    private handsOther: fgui.GObject;
    private handsNumber: fgui.GObject;
    private handsOriginPos: PosCtrl[];
    private myView: fgui.GComponent;
    private aniPos: fgui.GObject;
    private userInfoPos: fgui.GObject;
    private qipao: fgui.GComponent;
    private qipaoText: fgui.GObject;
    private roomHost: RoomHost;
    private msgTimerCB: Function;

    public constructor(viewUnityNode: fgui.GComponent, viewChairID: number, room: RoomInterfaceA) {
        this.room = room;
        this.viewChairID = viewChairID;
        this.roomHost = this.room.getRoomHost();

        //这里需要把player的chairID转换为游戏视图中的chairID，这是因为，无论当前玩家本人
        //的chair ID是多少，他都是居于正中下方，左手是上家，右手是下家，正中上方是对家
        this.myView = viewUnityNode.getChild(`player${viewChairID}`).asCom;
        if (viewChairID === 1) {
            this.operationPanel = viewUnityNode.getChild("operationPanel").asCom;
            this.initOperationButtons();
        }

        //头像相关
        this.initHeadView();
        //其他UI
        this.initOtherView();
        //玩家状态
        this.initPlayerStatus();

        //动画挂载点
        this.aniPos = this.myView.getChild("aniPos");
    }

    public initCardLists(): void {
        //手牌列表
        this.initHands();
        //出牌列表
        this.initDiscards();
        //明牌列表
        this.initLights();
    }

    //隐藏所有操作按钮
    public hideOperationButtons(): void {
        //先隐藏掉所有按钮
        this.skipBtn.visible = false;
        this.tipBtn.visible = false;
        this.discardBtn.visible = false;
        //隐藏根节点
        // this.operationPanel.visible = false;
    }

    //界面操作
    //设置金币数显示（目前是累计分数）
    public setGold(): void {

        // if checkint(gold) < 0 {
        //this.head.goldText1. Show()
        //this.head.goldText. Hide()
        //this.head.goldText1.text = tostring(gold)
        // else
        //this.head.goldText1. Hide()
        //this.head.goldText. Show()
        //this.head.goldText.text = tostring(gold)
        //}
    }

    //设置头像特殊效果是否显示（当前出牌者则显示）
    public setHeadEffectBox(isShow: boolean): void {
        // const x = this.head.pos.x
        // const y = this.head.pos.y
        // const ani = animation.play("animations/Effects_UI_touxiang.prefab", this.head.headView, x, y, true);
        // ani.setVisible(isShow)
        if (isShow) {
            this.roomHost.animationMgr.play(`lobby/prefabs/mahjong/Effect_UI_touxiang`, this.head.pos.node);
        }
        this.head.pos.visible = isShow;
    }

    //从根节点上隐藏所有
    public hideAll(): void {
        this.head.hideAll();
        this.hideHands();
        this.hideLights();
        this.hideDiscarded();
    }

    //新的一手牌开始，做一些清理后再开始
    public resetForNewHand(): void {
        this.hideHands();
        this.hideLights();
        this.hideDiscarded();

        this.setHeadEffectBox(false);

        if (this.viewChairID === 1) {
            this.hideOperationButtons();
        }
    }

    //隐藏打出去的牌列表
    public hideDiscarded(): void {
        if (this.discards != null) {
            for (const d of this.discards) {
                d.visible = false;
            }
        }
    }

    //隐藏摊开牌列表
    public hideLights(): void {
        if (this.lights !== undefined) {
            for (const h of this.lights) {
                h.visible = false;
            }
        }
    }

    //隐藏手牌列表
    public hideHands(): void {
        if (this.handsMe !== undefined && this.handsMe !== null) {
            for (const h of this.handsMe) {
                h.visible = false;
            }
        }
        if (this.handsOther !== undefined && this.handsOther !== null) {
            this.handsOther.visible = false;
        }
    }

    //显示打出去的牌，明牌显示
    public showDiscarded(): void {
        //先隐藏所有的打出牌节点
        const discards = this.discards;
        this.hideDiscarded();
        const tilesDiscard = this.player.tilesDiscarded;
        //已经打出去的牌个数
        const tileCount = tilesDiscard.length;
        //打出牌的挂载点个数
        const dCount = discards.length;
        //从那张牌开始挂载，由于tileCount可能大于dCount
        //因此，需要选择tilesDiscarded末尾的dCount个牌显示即可
        let begin = tileCount - dCount;
        if (begin < 0) {
            begin = 0;
        }

        let lastD;
        let lastT;
        //i计数器对应tilesDiscarded列表
        for (let i = begin; i < tileCount; i++) {
            lastD = discards[i % dCount];
            lastT = tilesDiscard[i];
            TileImageMounterA.mountTileImage(lastD, lastT);
            lastD.visible = true;
        }
    }

    //显示对手玩家的手牌，对手玩家的手牌是暗牌显示
    public showHandsForOpponents(cardCountOnHand: number): void {
        this.handsOther.visible = true;

        this.handsNumber.text = `${cardCountOnHand}`;
        this.handsNumber.visible = true;
    }

    //为本人显示手牌，也即是1号playerView(prefab中的1号)//@param wholeMove 是否整体移动
    public showHandsForMe(wholeMove: boolean): void {
        const tileshand = this.player.tilesHand;
        const tileCountInHand = tileshand.length;
        const handsClickCtrls = this.handsClickCtrls;
        //删除tileID
        //tileID主要是用于点击手牌时，知道该手牌对应那张牌ID
        for (const handsClickCtrl of handsClickCtrls) {
            handsClickCtrl.tileID = null;
        }

        //恢复所有牌的位置，由于点击手牌时会把手牌向上移动
        this.restoreHandsPositionAndClickCount(-1);

        let j = 0;
        for (let i = 0; i < tileCountInHand; i++) {
            const h = this.handsMe[j];
            TileImageMounterA.mountTileImage(h, tileshand[i]);
            h.visible = true;
            handsClickCtrls[j].tileID = tileshand[i];
            j = j + 1;
        }
    }

    //把手牌摊开，包括对手的暗杠牌，用于一手牌结束时
    public hand2Exposed(wholeMove: boolean): void {
        //不需要手牌显示了，全部摊开
        this.hideLights();

        const tileshand = this.player.tilesHand;
        const tileCountInHand = tileshand.length;

        let j = 0;
        for (let i = 0; i < tileCountInHand; i++) {
            const light = this.lights[j];
            TileImageMounterA.mountTileImage(light, tileshand[i]);
            light.visible = true;
            j = j + 1;
        }
    }

    //清除掉由于服务器发下来allowed actions而导致显示出来的view//例如吃椪杠操作面板等等
    public clearAllowedActionsView(): void {

        this.hideOperationButtons();
    }
    //处理玩家点击手牌按钮
    public onHandTileBtnClick(index: number): void {
        // Logger.debug("onHandTileBtnClick : ", index);
        const handsClickCtrls = this.handsClickCtrls;

        const player = this.player;
        if (player === null) {
            Logger.debug("player === null");

            return;
        }

        const clickCtrl = handsClickCtrls[index];
        clickCtrl.clickCount = clickCtrl.clickCount + 1;
        if (clickCtrl.clickCount === 1) {
            this.moveHandUp(index);
        }
        if (clickCtrl.clickCount === 2) {
            this.restoreHandUp(index);
        }
    }

    //还原所有手牌到它初始化时候的位置，并把clickCount重置为0
    public restoreHandsPositionAndClickCount(index: number): void {
        for (let i = 0; i < 16; i++) {
            if (i !== index) {
                const clickCtrl = this.handsClickCtrls[i];
                const originPos = this.handsOriginPos[i];
                const h = clickCtrl.h;
                h.y = originPos.y;
                clickCtrl.clickCount = 0;
            }
        }
    }

    //显示玩家头像
    public showPlayerInfo(playerInfo: PlayerInfo): void {
        this.head.headView.visible = true;
        this.head.headView.onClick(this.player.onPlayerInfoClick, this.player);

        let nick = playerInfo.nick;
        if (nick === undefined || nick === "") {
            nick = playerInfo.userID;
        }
        //裁剪
        if (nick.length > 8) {
            nick = `${nick.substring(0, 8)}...`;
        }
        // this.head.nameText.text = nick;
        // this.head.nameText.visible = true;
        //头像
        CommonFunction.setHead(this.head.headLoader, playerInfo.headIconURI, playerInfo.gender);
    }

    //显示桌主
    public showOwner(): void {
        const player = this.player;
        this.head.roomOwnerFlag.visible = player.isMe();
    }

    public playerOperationEffect(effectName: string): void {
        // if (isWait) {
        //     await this.roomHost.animationMgr.coPlay(`lobby/prefabs/mahjong/${effectName}`, this.aniPos.node);
        // } else {
        this.roomHost.animationMgr.play(`lobby/prefabs/guanzhang/${effectName}`, this.aniPos.node);
        // }
    }

    //特效道具播放
    public playerDonateEffect(effectName: string): void {
        this.roomHost.animationMgr.play(`lobby/prefabs/donate/${effectName}`, this.head.headView.node);
    }

    //设置灰度
    public setGray(obj: fgui.GComponent): void {
        obj.grayed = true;
    }

    //恢复灰度
    public clearGray(obj: fgui.GComponent): void {
        obj.grayed = false;
    }

    public getUserInfoPos(): fgui.GObject {
        return this.userInfoPos;
    }

    //显示聊天消息
    public showChatMsg(str: string): void {
        if (str !== undefined && str !== null) {
            if (this.msgTimerCB === undefined) {
                this.msgTimerCB = <Function>this.hideChatMsg.bind(this);
            }
            this.qipaoText.text = str;
            this.qipao.visible = true;
            //定时隐藏
            this.roomHost.component.unschedule(this.msgTimerCB);
            this.roomHost.component.scheduleOnce(this.msgTimerCB, 3);
        }
    }

    //还原所有手牌到它初始化时候的位置，并把clickCount重置为0
    public restoreHandPositionAndClickCount(index: number): void {
        for (let i = 0; i < this.handsClickCtrls.length; i++) {
            if (i !== index) {
                this.restoreHandUp(i);
            }
        }
    }

    //把手牌往上移动30的单位距离
    public moveHandUp(index: number): void {
        const originPos = this.handsOriginPos[index];
        const h = this.handsClickCtrls[index].h;
        h.y = originPos.y - 30;
        this.handsClickCtrls[index].clickCount = 1;
    }
    private hideChatMsg(): void {
        this.qipao.visible = false;
    }

    private initOtherView(): void {

        // this.aniPos = view.getChild("aniPos")
        this.userInfoPos = this.myView.getChild("userInfoPos");

        //聊天气泡
        this.qipao = this.myView.getChild("qipao").asCom;
        this.qipaoText = this.qipao.getChild("text");
    }

    //头像周边内容节点
    private initHeadView(): void {

        const head = new Head();

        head.headView = this.myView.getChild("head").asCom;
        head.headView.visible = false;
        head.pos = head.headView.getChild("pos");
        head.headLoader = head.headView.getChild("n1").asLoader;
        //ready状态指示
        head.readyIndicator = this.myView.getChild("ready");
        head.readyIndicator.visible = false;
        //房间拥有者标志
        head.roomOwnerFlag = this.myView.getChild("roomOwner");
        head.roomOwnerFlag.visible = false;

        // head.nameText = this.myView.getChild("nameText");
        // head.nameText.visible = false;

        head.hideAll = (): void => {
            head.headView.visible = false;
            head.readyIndicator.visible = false;
            head.roomOwnerFlag.visible = false;
            // head.nameText.visible = false;
        };

        this.head = head;
    }

    //玩家状态
    private initPlayerStatus(): void {
        //起始
        const onStart = (): void => {
            this.head.readyIndicator.visible = false;
        };

        //准备
        const onReady = (): void => {
            this.head.readyIndicator.visible = true;
            this.head.headView.grayed = false;
            this.showOwner();
        };

        //离线
        const onLeave = (): void => {
            this.head.readyIndicator.visible = false;
            this.head.headView.grayed = true;
        };

        //正在玩
        const onPlaying = (): void => {
            this.head.readyIndicator.visible = false;
            this.head.headView.grayed = false;

            this.showOwner();
        };

        const status = [];
        status[pokerface.PlayerState.PSNone] = onStart;
        status[pokerface.PlayerState.PSReady] = onReady;
        status[pokerface.PlayerState.PSOffline] = onLeave;
        status[pokerface.PlayerState.PSPlaying] = onPlaying;
        this.onUpdateStatus = status;
    }

    //把手牌还原位置
    private restoreHandUp(index: number): void {
        const originPos = this.handsOriginPos[index];
        const h = this.handsClickCtrls[index].h;
        h.y = originPos.y;
        this.handsClickCtrls[index].clickCount = 0;
    }

    //明牌列表
    private initLights(): void {
        const lights: fgui.GComponent[] = [];
        const myLightTilesNode = this.myView.getChild("lights").asCom;
        for (let i = 0; i < 16; i++) {
            const h = myLightTilesNode.getChild(`n${i + 1}`).asCom;
            lights[i] = h;
        }
        this.lights = lights;
    }

    //打出的牌列表
    private initDiscards(): void {
        const discards: fgui.GComponent[] = [];
        const myDicardTilesNode = this.myView.getChild("discards").asCom;
        for (let i = 0; i < 16; i++) {
            const card = myDicardTilesNode.getChild(`n${i + 1}`).asCom;
            discards[i] = card;
        }
        this.discards = discards;
    }

    //手牌列表
    private initHands(): void {
        const myHandTilesNode = this.myView.getChild("hands");
        const isMe = this.viewChairID === 1;
        if (isMe) {
            const hands: fgui.GComponent[] = [];
            const handsOriginPos: PosCtrl[] = [];
            const handsClickCtrls: ClickCtrl[] = [];
            for (let i = 0; i < 16; i++) {
                const card = myHandTilesNode.asCom.getChild(`n${i + 1}`).asCom;

                card.name = i.toString(); //把手牌按钮对应的序号记忆，以便点击时可以识别
                card.visible = false;
                hands[i] = card;

                handsOriginPos[i] = new PosCtrl(card.x, card.y);
                const cc = new ClickCtrl();
                cc.clickCount = 0;
                cc.h = card;
                handsClickCtrls[i] = cc;

                card.onClick(
                    () => {
                        this.onHandTileBtnClick(i);
                    },
                    this
                );
            }
            this.handsMe = hands;
            this.handsOriginPos = handsOriginPos; //记忆原始的手牌位置，以便点击手牌时可以往上弹起以及恢复
            this.handsClickCtrls = handsClickCtrls; // 手牌点击时控制数据结构
        } else {
            //用于显示手牌数量
            this.handsNumber = this.myView.getChild("handsNum");
            this.handsOther = myHandTilesNode;
        }
    }

    // public itemProviderButtonList(index: number): string {
    //     return this.buttonDataList[index];
    // }
    //操作按钮
    private initOperationButtons(): void {
        this.skipBtn = this.operationPanel.getChild("pass").asButton;
        this.tipBtn = this.operationPanel.getChild("tip").asButton;
        this.discardBtn = this.operationPanel.getChild("discard").asButton;
        this.tipBtn.onClick(
            () => {
                this.player.onTipBtnClick();
            },
            this
        );
        this.skipBtn.onClick(
            () => {
                this.player.onSkipBtnClick();
            },
            this
        );
        this.discardBtn.onClick(
            () => {
                this.player.onDiscardBtnClick();
            },
            this
        );
        this.hideOperationButtons();
    }

}

/**
 * lobby 模块入口
 */
const { ccclass } = cc._decorator;
import { GameModule } from "../gameb/GamebExports";
import { GResLoaderImpl } from "./GResLoaderImpl";
import { Dialog } from "./lcore/Dialog";
import { GameModuleInterface, GameModuleLaunchArgs, LobbyModuleInterface } from "./lcore/LDataType";
import { Logger } from "./lcore/Logger";
import { LoginView } from "./views/LoginView";

/**
 * hello
 */
@ccclass
export class LobbyModule extends cc.Component implements LobbyModuleInterface {
    public loader: GResLoaderImpl;
    public eventTarget: cc.EventTarget;
    // 用于挂载子游戏模块的节点，在离开子游戏模块并回到大厅后销毁
    private gameNode: cc.Node;
    private gameLoader: GResLoaderImpl;
    private view: fgui.GObject;

    private loginView: LoginView;

    public cleanupGRoot(): void {
        const children = fgui.GRoot.inst._children;
        const wins: fgui.Window[] = [];
        children.forEach((c) => {
            if (c instanceof fgui.Window) {
                wins.push(c);
            }
        });

        wins.forEach((w) => {
            w.hide();
            w.dispose();
        });

        fgui.GRoot.inst.removeChildren(0, -1, true);
    }

    public returnFromGame(): void {
        this.cleanupGRoot();

        this.gameNode.destroyAllChildren();
        this.gameNode.destroy();

        delete this.gameNode;
        const num = fgui.GRoot.inst.numChildren;
        if (num > 0) {
            throw new Error(`returnFromGame failed, ui count should be 0, now:${num}`);
        }
        fgui.GRoot.inst.addChild(this.view);

        this.eventTarget.emit(`onGameRecordShow`);
    }

    public switchToGame(params: GameModuleLaunchArgs, moduleName: string): void {
        // 任何时刻只有一个子游戏
        if (this.gameNode !== undefined) {
            Logger.error("switch to game failed, there is a game running:", this.gameNode.name);

            return;
        }

        // 隐藏大厅窗口
        this.view = fgui.GRoot.inst.getChildAt(0);
        fgui.GRoot.inst.removeChild(this.view);

        const childrenCount = fgui.GRoot.inst.numChildren;
        if (childrenCount > 0) {
            Logger.fatal("switch to game failed, GRoot numChildren not zero:", childrenCount);

            return;
        }

        // 资源加载
        if (this.gameLoader !== undefined && this.gameLoader.name !== moduleName) {
            // 卸载旧的模块
            this.gameLoader.unload();
            delete this.gameLoader;
        }

        if (this.gameLoader === undefined) {
            // 需要新建一个新的资源加载器
            this.gameLoader = new GResLoaderImpl(moduleName);
        }

        params.loader = this.gameLoader;
        params.lm = this;

        // 加载子游戏的所有资源，显示加载进度
        this.gameLoader.loadResDir(
            moduleName,
            (error) => {
                Logger.debug(`gamea load, error:${error}`);
                if (error == null) {
                    switch (moduleName) {
                        case "gameb":
                            // 新建节点，然后挂载游戏组件
                            const gameNode = new cc.Node(moduleName);
                            this.node.addChild(gameNode);
                            this.gameNode = gameNode;
                            const gmc = this.gameNode.addComponent(GameModule);
                            const gm = <GameModuleInterface>gmc;
                            // 启动游戏流程
                            gm.launch(params);
                            break;
                        default:
                    }
                }
            }
        );
    }

    protected start(): void {
        this.loader = new GResLoaderImpl("lobby");
        this.eventTarget = new cc.EventTarget();

        Dialog.initDialogs(this.loader);

        //优先加载login资源，用于显示loading
        this.loader.loadResDir("Lauch", (error) => {
            Logger.debug(`Lauch load, error:${error}`);
            if (error == null) {
                this.loginView = this.addComponent(LoginView);
                this.loadLobbyRes();
            }
        });
    }

    // 加载大厅的所有资源，显示加载进度
    private loadLobbyRes(): void {
        this.loader.loadResDir(
            "lobby",
            (error) => {
                Logger.debug(`lobby load, error:${error}`);
                if (error == null) {
                    this.onResLoadedCompleted();
                }
            },
            (progress) => {
                this.loginView.updateProgressBar(progress);
            });
    }

    private onResLoadedCompleted(): void {
        // 增加一些房间内用到的大厅package，注意数量不能太多，会影响加载速度
        this.loader.fguiAddPackage("lobby/fui_create_room/lobby_create_room");

        this.loginView.updateCompleted();
    }
}

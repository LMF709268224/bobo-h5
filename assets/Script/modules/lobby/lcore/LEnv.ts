/**
 * lobby 配置
 */
export namespace LEnv {
    export const VER_STR: string = "v1.0.0";

    // updateQuery = "/lobby/upgrade/query",
    export const updateQuery: string = "/lobby/uuid/upgradeQuery";
    export const updateDownload = "http://localhost:8080"; // tslint:disable-line:no-http-string
    export const gameWebsocketMonkey = "/game/{0}/ws/monkey";
    export const gameWebsocketPlay = "/game/{0}/ws/play";
    export const rootURL = "http://121.196.210.106:30002"; // tslint:disable-line:no-http-string
    export const gameHost = "ws://localhost:3001"; // tslint:disable-line:no-http-string
    export const quicklyLogin = "/lobby/uuid/quicklyLogin";
    export const accountLogin = "/lobby/uuid/accountLogin";
    export const wxLogin = "/lobby/uuid/wxLogin";
    export const register = "/lobby/uuid/register";
    export const chat = "/lobby/uuid/chat";
    export const lobbyWebsocket = "ws://121.196.210.106:30002/lobby/uuid/ws";

    // -- 创建房间
    export const createRoom = "/lobby/uuid/createRoom";
    export const loadRoomPriceCfgs = "/lobby/uuid/loadPrices";
    export const requestRoomInfo = "/lobby/uuid/requestRoomInfo";
    // --战绩
    export const lrproom = "/lobby/uuid/lrproom";
    export const lrprecord = "/lobby/uuid/lrprecord";
    // -- 邮件
    export const loadMails = "/lobby/uuid/loadMails";
    export const setMailRead = "/lobby/uuid/setMailRead";
    export const deleteMail = "/lobby/uuid/deleteMail";
    export const receiveAttachment = "/lobby/uuid/receiveAttachment";
    // -- 牌友圈
    export const createClub = "/lobby/uuid/createClub";
    export const loadMyClubs = "/lobby/uuid/loadMyClubs";
    export const deleteClub = "/lobby/uuid/deleteClub";

    export const cfmt = (str: string, ...args: any[]): string => { // tslint:disable-line:no-any
        return str.replace(/{(\d+)}/g, (match, n) => {
            return (typeof args[n]) !== "undefined"
                ? args[n]  // tslint:disable-line:no-unsafe-any
                : match
                ;
        });
    };
}
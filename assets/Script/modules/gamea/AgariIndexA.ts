import { Logger } from "../lobby/lcore/LCoreExports";
import { proto } from "./proto/protoGameA";

const pokerface = proto.pokerface;
const pokerfacerf = proto.prunfast;

const indexMap: { [key: number]: number } = {
    [pokerface.CardID.R2H]: 0, //H 红桃
    [pokerface.CardID.R2D]: 1, //D 方块
    [pokerface.CardID.R2C]: 2, //C 梅花
    [pokerface.CardID.R2S]: 3, //S 黑桃
    [pokerface.CardID.R3H]: 4,
    [pokerface.CardID.R3D]: 5,
    [pokerface.CardID.R3C]: 6,
    [pokerface.CardID.R3S]: 7,
    [pokerface.CardID.R4H]: 8,
    [pokerface.CardID.R4D]: 9,
    [pokerface.CardID.R4C]: 10,
    [pokerface.CardID.R4S]: 11,
    [pokerface.CardID.R5H]: 12,
    [pokerface.CardID.R5D]: 13,
    [pokerface.CardID.R5C]: 14,
    [pokerface.CardID.R5S]: 15,
    [pokerface.CardID.R6H]: 16,
    [pokerface.CardID.R6D]: 17,
    [pokerface.CardID.R6C]: 18,
    [pokerface.CardID.R6S]: 19,
    [pokerface.CardID.R7H]: 20,
    [pokerface.CardID.R7D]: 21,
    [pokerface.CardID.R7C]: 22,
    [pokerface.CardID.R7S]: 23,
    [pokerface.CardID.R8H]: 24,
    [pokerface.CardID.R8D]: 25,
    [pokerface.CardID.R8C]: 26,
    [pokerface.CardID.R8S]: 27,
    [pokerface.CardID.R9H]: 28,
    [pokerface.CardID.R9D]: 29,
    [pokerface.CardID.R9C]: 30,
    [pokerface.CardID.R9S]: 31,
    [pokerface.CardID.R10H]: 32,
    [pokerface.CardID.R10D]: 33,
    [pokerface.CardID.R10C]: 34,
    [pokerface.CardID.R10S]: 35,
    [pokerface.CardID.JH]: 36,
    [pokerface.CardID.JD]: 37,
    [pokerface.CardID.JC]: 38,
    [pokerface.CardID.JS]: 39,
    [pokerface.CardID.QH]: 40,
    [pokerface.CardID.QD]: 41,
    [pokerface.CardID.QC]: 42,
    [pokerface.CardID.QS]: 43,
    [pokerface.CardID.KH]: 44,
    [pokerface.CardID.KD]: 45,
    [pokerface.CardID.KC]: 46,
    [pokerface.CardID.KS]: 47,
    [pokerface.CardID.AH]: 48,
    [pokerface.CardID.AD]: 49,
    [pokerface.CardID.AC]: 50,
    [pokerface.CardID.AS]: 51,
    [pokerface.CardID.JOB]: 52,
    [pokerface.CardID.JOR]: 53,
    [pokerface.CardID.CARDMAX]: 54
};

/**
 * 牌id 跟 图片名映射
 */
export namespace AgariIndexA {
    const slots: number[] = [];
    for (let i = 0; i <= 14; i++) {
        slots.push(0);
    }

    const agariTable: { [key: number]: number } = {
        [0x423A35C7]: 0xA0A01,
        [0x14D]: 0x30908,
        [0x8235]: 0x50F08,
        [0x4]: 0x402,
        [0x1]: 0x103,
        [0x2]: 0x204,
        [0x20]: 0x507,
        [0x10F447]: 0x70701,
        [0xDE]: 0x20405,
        [0xCFA]: 0x20A09,
        [0x21]: 0x20608,
        [0xD05]: 0x40C08,
        [0xA98AC7]: 0x80801,
        [0x69F6BC7]: 0x90901,
        [0x16]: 0x20605,
        [0x8AE]: 0x30605,
        [0x56CE]: 0x40805,
        [0x3640E]: 0x50A05,
        [0x21E88E]: 0x60C05,
        [0x153158E]: 0x70E05,
        [0x3]: 0x306,
        [0x2B67]: 0x50501,
        [0x1B207]: 0x60601,
        [0x2964619C7]: 0xB0B01,
        [0x19DEBD01C7]: 0xC0C01,
        [0x515A6]: 0x30F09
    };

    // 克隆table
    // const stupidTableClone = (src: number[]): number[] => {
    //     const newX: number[] = [];
    //     for (const v of src) {
    //         newX.push(v);
    //     }

    //     return newX;
    // };
    //重置slots
    const resetSlots = (hai: number[]): void => {
        for (let i = 0; i < 14; i++) {
            slots[i] = 0;
        }
        for (const v of hai) {
            if (v !== undefined && v !== null) {
                const idx = Math.floor(v / 4);
                slots[idx] = slots[idx] + 1;
            }
        }
    };

    export const tileId2ArtId = (tileID: number): number => {
        const artId = indexMap[tileID];
        if (artId == null) {
            // Logger.debug(`no art id for tile:${tileID}`);
            throw Error(`no art id for tile:${tileID}`);
        }

        return artId;
    };

    //计算牌组的key
    const calcKey = (hai: number[]): number => {
        const slotLength = slots.length;
        for (let i = 0; i < slotLength; i++) {
            slots[i] = 0;
        }

        const haiLength = hai.length;
        for (let i = 0; i < haiLength; i++) {
            const h = hai[i];
            slots[Math.floor(h / 4)]++;
        }

        for (let i = 0; i < slotLength; i++) {
            if (slots[i] > 4) {
                throw Error(`card type great than 4,card:${i}`);
            }
        }

        // 排序，由小到大升序
        slots.sort((a, b) => a - b);

        let key = 0;
        for (let i = slotLength - 1; i >= 0; i--) {
            if (slots[i] === 0) {
                break;
            }

            key = key * 10 + (slots[i]);
        }

        for (let i = 0; i < slotLength; i++) {
            slots[i] = 0;
        }

        for (let i = 0; i < haiLength; i++) {
            const h = hai[i];
            slots[Math.floor(h / 4)]++;
        }

        return key;
    };

    const agariFlushVerify = (ct: proto.prunfast.CardHandType, flushLength: number): boolean => {
        let flushElmentCount = 0;
        switch (ct) {
            case proto.prunfast.CardHandType.Flush:
                flushElmentCount = 1;
                break;
            case proto.prunfast.CardHandType.Pair2X:
                flushElmentCount = 2;
                break;
            case proto.prunfast.CardHandType.Triplet2X:
            case proto.prunfast.CardHandType.Triplet2X2Pair:
                flushElmentCount = 3;
                break;
            default:
        }

        if (flushElmentCount === 0) {
            // 不是顺子类型
            return true;
        }

        let flushBegin = 0;

        const slotLength = slots.length;
        // 跳过2
        for (let i = 1; i < slotLength; i++) {
            if (slots[i] === flushElmentCount) {
                flushBegin = i;
                break;
            }
        }

        let flushLengthVerify = 1;
        for (let i = flushBegin + 1; i < slotLength; i++) {
            if (slots[i] !== flushElmentCount) {
                break;
            }
            flushLengthVerify++;
        }

        return flushLengthVerify >= flushLength;
    };

    //转换为MsgCardHand，如果转换失败，返回nil
    export const agariConvertMsgCardHand = (hai: number[]): proto.pokerface.MsgCardHand => {
        const key = calcKey(hai);
        if (agariTable[key] === undefined) {
            Logger.debug("agariConvertMsgCardHand undefined...");

            return null;
        }

        const agari = agariTable[key];
        const ct = <proto.prunfast.CardHandType>(agari & 0xFF);
        const msgCardhand = new pokerface.MsgCardHand();
        msgCardhand.cardHandType = <number>ct;

        // 排序，让大的牌在前面
        hai.sort((a, b) => b - a);

        // 如果是顺子类型则需要检查
        const flushLength = ((agari >> 16) & 0xFF);
        if (flushLength > 0) {
            if (!agariFlushVerify(ct, flushLength)) {
                Logger.debug("agariConvertMsgCardHand 顺子类型...");

                return null;
            }
        }

        let cardsNew: number[] = [];
        const haiLength = hai.length;
        switch (ct) {
            case proto.prunfast.CardHandType.TripletPair:
            case proto.prunfast.CardHandType.Triplet2X2Pair:
                // 确保3张在前面，对子在后面
                for (let i = 0; i < haiLength; i++) {
                    const h = hai[i];
                    if (Math.floor(h / 4) === 3) {
                        cardsNew.push(h);
                    }
                }
                for (let i = 0; i < haiLength; i++) {
                    const h = hai[i];
                    if (Math.floor(h / 4) !== 3) {
                        cardsNew.push(h);
                    }
                }
                break;
            default:
                cardsNew = cardsNew.concat(hai);
        }

        msgCardhand.cards = cardsNew;

        if (ct === proto.prunfast.CardHandType.Triplet) {
            if (Math.floor(msgCardhand.cards[0] / 4) === Math.floor(proto.pokerface.CardID.R3H / 4)) {
                // 如果是3个3，而且不包含红桃3，则把牌组改为炸弹，而不是三张
                let foundR3H = false;
                for (const c of msgCardhand.cards) {
                    if (Number(c) === proto.pokerface.CardID.R3H) {
                        foundR3H = true;
                        break;
                    }
                }

                if (!foundR3H) {
                    msgCardhand.cardHandType = proto.prunfast.CardHandType.Bomb;
                }
            } else if (Math.floor(msgCardhand.cards[0] / 4) === Math.floor(proto.pokerface.CardID.AH / 4)) {
                // 3张A也是炸弹
                msgCardhand.cardHandType = proto.prunfast.CardHandType.Bomb;
            }
        }

        return msgCardhand;
    };

    //判断当前的手牌是否大于上一手牌
    export const agariGreatThan = (prevCardHand: proto.pokerface.IMsgCardHand, current: proto.pokerface.IMsgCardHand): boolean => {
        // 如果当前的是炸弹
        if (current.cardHandType === proto.prunfast.CardHandType.Bomb) {
            // 上一手不是炸弹
            if (prevCardHand.cardHandType !== proto.prunfast.CardHandType.Bomb) {
                return true;
            }

            // 上一手也是炸弹，则比较炸弹牌的大小，大丰关张不存在多于4个牌的炸弹
            return Math.floor(current.cards[0] / 4) > Math.floor(prevCardHand.cards[0] / 4);
        }

        // 如果上一手牌是炸弹
        if (prevCardHand.cardHandType === proto.prunfast.CardHandType.Bomb) {
            return false;
        }

        // 必须类型匹配
        if (prevCardHand.cardHandType !== current.cardHandType) {
            return false;
        }

        // 张数匹配
        if (prevCardHand.cards.length !== current.cards.length) {
            return false;
        }

        // 单张时，2是最大的
        if (prevCardHand.cardHandType === proto.prunfast.CardHandType.Single) {
            if (Math.floor(prevCardHand.cards[0] / 4) === 0) {
                return false;

            }

            if (Math.floor(current.cards[0] / 4) === 0) {
                return true;
            }
        }

        // 现在只比较最大牌的大小

        return Math.floor(current.cards[0] / 4) > Math.floor(prevCardHand.cards[0] / 4);
    };
    //从手牌上根据rank抽取若干张牌到一个新table中

    const extractCardsByRank = (hands: number[], rank: number, count: number): number[] => {
        const extract = [];
        let ecount = 0;
        for (const h of hands) {
            if (Math.floor(h / 4) === rank) {
                extract.push(h);
                ecount = ecount + 1;
                if (ecount === count) {
                    break;
                }
            }
        }

        return extract;
    };
    //从手牌上根据rank范围抽取若干张牌到一个新table中

    const extractCardsByRanks = (hands: number[], rankStart: number, rankStop: number, count: number): number[] => {
        const extract = [];
        for (let rank = rankStart; rank <= rankStop; rank++) {
            let ecount = 0;
            for (const h of hands) {
                if (Math.floor(h / 4) === rank) {
                    extract.push(h);
                    ecount = ecount + 1;
                    if (ecount === count) {
                        break;
                    }
                }
            }
        }

        return extract;
    };
    //从手牌上寻找炸弹
    const findBomb = (hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const right = Math.floor(pokerface.CardID.AH / 4);
        // 跳过2和3，因为四个3是非法牌型
        for (let newBombSuitID = 2; newBombSuitID < right; newBombSuitID++) {
            if (slots[newBombSuitID] > 3) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Bomb;
                const xcards = extractCardsByRank(hands, newBombSuitID, 4);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
        }
        //如果有3个ACE，也是炸弹
        const aceRank = Math.floor(pokerface.CardID.AH / 4);
        if (slots[aceRank] > 2) {
            const cardHand = new proto.pokerface.MsgCardHand();
            cardHand.cardHandType = pokerfacerf.CardHandType.Bomb;
            const xcards = extractCardsByRank(hands, aceRank, 4);
            cardHand.cards = xcards;
            cardHands.push(cardHand);
        }
        //如果手上还有三张3，也算是炸弹，而且不算红桃3
        const r3Rank = Math.floor(pokerface.CardID.R3H / 4);
        if (slots[r3Rank] > 2) {
            const cards = [];
            for (const v of hands) {
                if (Math.floor(v / 4) === r3Rank && v !== pokerface.CardID.R3H) {
                    cards.push(v);
                }
            }
            if (cards.length === 3) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Bomb;
                const xcards = extractCardsByRank(hands, aceRank, 4);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"3张+两对子"的有效组合
    const findTriplet2X2PairGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const seqLength = Math.floor(prev.cards.length / 5); //减去2个对子;
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        let newBombSuitID = bombCardRankID + 1;
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        while (newBombSuitID <= rightMost) {
            const testBombRankID = newBombSuitID;
            let found = true;
            for (let i = 0; i < seqLength; i++) {
                if (slots[testBombRankID - i + 2] < 3) {
                    newBombSuitID = newBombSuitID + 1;

                    found = false;
                    break;
                }
            }

            // /找到了
            if (found) {
                const left = newBombSuitID + 1 - seqLength;
                const right = newBombSuitID;
                let pairCount = 0;
                const pairAble = [];

                for (let testPair = 0; testPair < (left - 1); testPair++) {
                    if (slots[testPair + 1] > 1) {
                        pairCount = pairCount + 1;
                        pairAble.push(testPair);
                    }
                }
                const uppon = Math.floor(pokerface.CardID.AH / 4);
                for (let testPair = right + 1; testPair < uppon; testPair++) {
                    if (slots[testPair] > 1) {
                        pairCount = pairCount + 1;
                        pairAble.push(testPair);
                    }
                }

                if (pairCount >= seqLength) {
                    //此处不在遍历各种对子组合
                    const cardHand = new proto.pokerface.MsgCardHand();
                    cardHand.cardHandType = pokerfacerf.CardHandType.Triplet2X2Pair;
                    let xcards = extractCardsByRanks(hands, left, right, 3);
                    cardHand.cards = cardHand.cards.concat(xcards);
                    for (let i = 0; i < pairAble.length; i++) {
                        xcards = extractCardsByRank(hands, pairAble[i], 2);
                        cardHand.cards = cardHand.cards.concat(xcards);
                        if (i === seqLength) {
                            break;
                        }
                    }
                    cardHands.push(cardHand);
                }
                newBombSuitID = newBombSuitID + 1;
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"3张+对子"的有效组合
    const findTripletPairGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const flushLen = prev.cards.length - 2; //减去对子;
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        const seqLength = Math.floor(flushLen / 3);
        let newBombSuitID = bombCardRankID + 1;
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        while (newBombSuitID <= rightMost) {
            const testBombRankID = newBombSuitID;
            let found = true;
            for (let i = 0; i < seqLength; i++) {
                if (slots[testBombRankID - i] < 3) {
                    newBombSuitID = newBombSuitID + 1;

                    found = false;
                    break;
                }
            }

            // /找到了
            if (found) {
                const left = newBombSuitID + 1 - seqLength;
                const right = newBombSuitID;
                let pairCount = 0;
                const pairAble = [];

                for (let testPair = 0; testPair < left; testPair++) {
                    if (slots[testPair] > 1) {
                        pairCount = pairCount + 1;
                        pairAble.push(testPair);
                    }
                }
                const uppon = Math.floor(pokerface.CardID.AH / 4);
                for (let testPair = right; testPair < uppon; testPair++) {
                    if (slots[testPair] > 1) {
                        pairCount = pairCount + 1;
                        pairAble.push(testPair);
                    }
                }

                if (pairCount > 0) {
                    //此处不再遍历各个对子
                    const cardHand = new proto.pokerface.MsgCardHand();
                    cardHand.cardHandType = pokerfacerf.CardHandType.TripletPair;
                    let xcards = extractCardsByRank(hands, left, 3);
                    cardHand.cards = cardHand.cards.concat(xcards);
                    xcards = extractCardsByRank(hands, pairAble[0], 2);
                    cardHand.cards = cardHand.cards.concat(xcards);
                    cardHands.push(cardHand);
                }
                newBombSuitID = newBombSuitID + 1;
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"3张"的有效组合
    const findTripletGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        // 找一个较大的对子
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        for (let newBombSuitID = bombCardRankID + 1; newBombSuitID < rightMost; newBombSuitID++) {
            if (slots[newBombSuitID] > 2) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Triplet;
                const xcards = extractCardsByRank(hands, newBombSuitID, 3);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"连3张"的有效组合
    const findTriplet2XGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const flushLen = prev.cards.length;
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        const seqLength = Math.floor(flushLen / 3);
        let newBombSuitID = bombCardRankID + 1;
        // 找一个较大的对子
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        while (newBombSuitID <= rightMost) {
            const testBombRankID = newBombSuitID;
            let found = true;
            for (let i = 0; i < seqLength; i++) {
                if (slots[testBombRankID - i] < 3) {
                    newBombSuitID = newBombSuitID + 1;

                    found = false;
                    break;
                }
            }

            // /找到了
            if (found) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Triplet2X;
                const xcards = extractCardsByRanks(hands, testBombRankID - seqLength + 1, testBombRankID, 3);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
                newBombSuitID = newBombSuitID + 1;
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"连对"的有效组合
    const findPair2XGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const flushLen = prev.cards.length;
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        const seqLength = Math.floor(flushLen / 2);
        let newBombSuitID = bombCardRankID + 1;
        // 找一个较大的对子
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        while (newBombSuitID <= rightMost) {
            const testBombRankID = newBombSuitID;
            let found = true;
            for (let i = 0; i < seqLength; i++) {
                if (slots[testBombRankID - i] < 2) {
                    newBombSuitID = newBombSuitID + 1;

                    found = false;
                    break;
                }
            }

            // /找到了
            if (found) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Pair2X;
                const xcards = extractCardsByRanks(hands, testBombRankID - seqLength + 1, testBombRankID, 2);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
                newBombSuitID = newBombSuitID + 1;
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"对子"的有效组合
    const findPairGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        // 找一个较大的对子
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        for (let newBombSuitID = bombCardRankID + 1; newBombSuitID < rightMost; newBombSuitID++) {
            if (slots[newBombSuitID] > 1) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Pair;
                const xcards = extractCardsByRank(hands, newBombSuitID, 2);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
        }

        return cardHands;
    };
    //寻找所有大于上一手"单张"的有效组合
    const findSingleGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        if (bombCardRankID === 0) {
            // 2已经是最大的单张了
            return cardHands;
        }
        // 找一个较大的单张
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        let newBombSuitID = bombCardRankID + 1;
        while (newBombSuitID <= rightMost) {
            if (slots[newBombSuitID] > 0) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Single;
                const xcards = extractCardsByRank(hands, newBombSuitID, 1);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
            newBombSuitID = newBombSuitID + 1;
        }
        //自己有2，那就是最大
        if (slots[0] > 0) {
            const cardHand = new proto.pokerface.MsgCardHand();
            cardHand.cardHandType = pokerfacerf.CardHandType.Single;
            const xcards = extractCardsByRank(hands, 0, 1);
            cardHand.cards = xcards;
            cardHands.push(cardHand);
        }

        return cardHands;
    };
    //寻找所有大于上一手"顺子"的有效组合
    const findFlushGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        //注意不需要考虑333这种炸弹，因为他是最小的，
        //而现在是寻找一个大于某个炸弹的炸弹
        const cardHands = [];
        resetSlots(hands);
        const flushLen = prev.cards.length;
        const bombCardRankID = Math.floor(prev.cards[0] / 4); // 最大的顺子牌rank
        let newBombSuitID = bombCardRankID + 1;
        const rightMost = Math.floor(pokerface.CardID.AH / 4); // AH 改为 R3H  20180201 mufan
        while (newBombSuitID < rightMost) {
            // const testBombRankID = newBombSuitID;
            let found = true;
            for (let i = 0; i < flushLen; i++) {
                if (slots[newBombSuitID - i] < 1) {
                    // newBombSuitID = newBombSuitID + 1;
                    found = false;

                    break;
                }
            }
            //找到了
            if (found) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Flush;
                const xcards = extractCardsByRanks(hands, newBombSuitID - flushLen + 1, newBombSuitID, 1);
                cardHand.cards = xcards;
                cardHands.push(cardHand);

            }
            newBombSuitID++;

        }

        return cardHands;
    };
    //寻找所有大于上一手"炸弹"的有效组合
    const findBombGreatThan = (prev: proto.pokerface.MsgCardHand, hands: number[]): proto.pokerface.MsgCardHand[] => {
        //注意不需要考虑333这种炸弹，因为他是最小的，
        //而现在是寻找一个大于某个炸弹的炸弹
        const cardHands = [];
        resetSlots(hands);
        const bombCardRankID = Math.floor(prev.cards[0] / 4);
        const rightMost = Math.floor(pokerface.CardID.AH / 4);
        //4张的是炸弹
        for (let newBombSuitID = bombCardRankID; newBombSuitID < rightMost; newBombSuitID++) {
            if (slots[newBombSuitID + 1] > 3) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Bomb;
                const xcards = extractCardsByRank(hands, newBombSuitID, 4);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
        }
        //如果有3个ACE，也是炸弹
        if (slots[rightMost] > 2) {
            const cardHand = new proto.pokerface.MsgCardHand();
            cardHand.cardHandType = pokerfacerf.CardHandType.Bomb;
            const xcards = extractCardsByRank(hands, rightMost, 4);
            cardHand.cards = xcards;
            cardHands.push(cardHand);
        }

        return cardHands;
    };

    //寻找单张
    const searchUseableSingle = (hands: number[]): proto.pokerface.MsgCardHand[] => {
        const cardHands: proto.pokerface.MsgCardHand[] = [];
        resetSlots(hands);
        const right = Math.floor(pokerface.CardID.AH / 4);
        //找一个较大的单张
        for (let newBombSuitID = 0; newBombSuitID < right; newBombSuitID++) {
            if (slots[newBombSuitID + 1] > 0) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Single;
                const xcards = extractCardsByRank(hands, newBombSuitID, 1);
                cardHand.cards = xcards;
                cardHands.push(cardHand);
            }
        }
        //自己有2，那就是最大
        if (slots[0] > 0) {
            const cardHand = new proto.pokerface.MsgCardHand();
            cardHand.cardHandType = pokerfacerf.CardHandType.Single;
            const xcards = extractCardsByRank(hands, 0, 1);
            cardHand.cards = xcards;
            cardHands.push(cardHand);
        }

        return cardHands;
    };
    //提示自己出牌
    export const searchLongestDiscardCardHand = (hands: number[], specialCardID: number): proto.pokerface.MsgCardHand[] => {
        hands.sort((x: number, y: number) => {
            return x - y;
        });
        const tt = searchUseableSingle(hands);
        const needR3h = specialCardID >= 0;
        if (needR3h) {
            for (const t of tt) {
                for (let j = 0; j < (t.cards.length - 1); j++) {
                    if (t.cards[j] === pokerface.CardID.R3H) {
                        return [t];
                    }
                }
            }
        }

        return tt;
    };
    //寻找所有大于某一手牌的手牌
    export const findAllGreatThanCardHands =
        (prev: proto.pokerface.IMsgCardHand, hands: number[], specialCardID: number): proto.pokerface.MsgCardHand[] => {
            const prevCT = prev.cardHandType;
            let isBomb = false;
            let tt: proto.pokerface.MsgCardHand[] = [];
            if (specialCardID >= 0) {
                const cardHand = new proto.pokerface.MsgCardHand();
                cardHand.cardHandType = pokerfacerf.CardHandType.Single;
                //目前这种情况只有红桃2，也即是rank == 0
                cardHand.cards = extractCardsByRank(hands, 0, 1);
                tt.push(cardHand);

                return tt;
            }

            if (prevCT === pokerfacerf.CardHandType.Bomb) {
                isBomb = true;
            }

            const fnMaps: { [key: string]: (p: proto.pokerface.MsgCardHand, h: number[]) => proto.pokerface.MsgCardHand[] } = {
                [pokerfacerf.CardHandType.Bomb]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findBombGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Flush]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findFlushGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Single]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findSingleGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Pair]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findPairGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Pair2X]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findPair2XGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Triplet]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findTripletGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Triplet2X]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findTriplet2XGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.Triplet2X2Pair]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findTriplet2X2PairGreatThan(p, h);
                },
                [pokerfacerf.CardHandType.TripletPair]: (p: proto.pokerface.MsgCardHand, h: number[]) => {
                    return findTripletPairGreatThan(p, h);
                }
            };

            const fn: (p: proto.pokerface.IMsgCardHand, h: number[]) => proto.pokerface.MsgCardHand[] = fnMaps[prevCT];
            tt = fn(prev, hands);

            if (!isBomb) {
                const tt2 = findBomb(hands);
                tt = tt.concat(tt2);
            }

            return tt;
        };
}

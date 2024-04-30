import { defineStore } from 'pinia'
import { reactive } from 'vue';
import type {UserInfoVo} from "@/types/types";

type DictData = {
    [key: string]: {
        [key: string]: string;
    };
};

export const useCommonStore = defineStore('common', () => {

    const userInfo: UserInfoVo = reactive({
        name: ''
    })

    const dictDataMap: DictData = reactive({
        'mealTime': {
            '0': '任意时间',
            '1': '早餐',
            '2': '午餐',
            '3': '晚餐'
        },
        'dishesType': {
            '0': '',
            '1': '荤',
            '2': '素',
            '3': '荤素'
        },
        'dishesStatus': {
            '1': '启用',
            '2': '禁用',
            '3': '售空'
        }
    })

    function getDictName(dictKey: string, dictCode: string | number) {
        let dictMap = dictDataMap[dictKey]
        if (dictMap == undefined) return ''
        return dictMap[dictCode.toString()]
    }

    return { userInfo, getDictName }
})

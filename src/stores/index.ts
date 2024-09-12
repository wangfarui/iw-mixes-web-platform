import { defineStore } from 'pinia'
import { reactive } from 'vue';
import type {UserInfoVo} from "@/types/types";

type DictObjectData = {
    [key: string]: {
        [key: string]: string;
    };
};

type DictArrayData = {
    [key: string]: Array<any>;
};

type DictObject = {
    code: string,
    name: string
}

export const useCommonStore = defineStore('common', () => {

    const userInfo: UserInfoVo = reactive({
        name: ''
    })
    
    const dictArrayMap: DictArrayData = reactive({
        // 字典类型
        'dictType': []
    })

    const dictObjectMap: DictObjectData = reactive({
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
        },
        // 记账 - 记录类型
        'recordCategory' : {
            '1': '支出',
            '2': '收入'
        },
        // 字典类型
        'dictType': {

        }
    })

    function getDictName(dictKey: string, dictCode: string | number) {
        let dictMap = dictObjectMap[dictKey]
        if (dictMap == undefined) return ''
        return dictMap[dictCode.toString()]
    }

    function setDictObject(dictKey: string, dictObject: Array<DictObject>) {
        let dictType: any = {}
        for (let o of dictObject) {
            dictType[o.code] = o.name
        }
        dictObjectMap[dictKey] = dictType
        dictArrayMap[dictKey] = dictObject
    }

    function getDictObject(dictKey: string) {
        return dictObjectMap[dictKey]
    }

    function getDictArray(dictKey: string) {
        return dictArrayMap[dictKey]
    }

    return { userInfo, getDictName, setDictObject, getDictObject, getDictArray }
})

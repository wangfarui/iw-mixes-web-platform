import { defineStore } from 'pinia'
import { reactive } from 'vue';

type DictData = {
    [key: string]: {
        [key: string]: string;
    };
};

export const useDictStore = defineStore('dict', () => {

    const dictDataMap: DictData = reactive({
        'dishesType': {
            '0': '',
            '1': '荤',
            '2': '素',
            '3': '荤素'
        },
        'mealTime': {
            '0': '任意时间',
            '1': '早餐',
            '2': '午餐',
            '3': '晚餐'
        }
    })
    function getDictName(dictKey: string, dictCode: string | number) {
        let dictMap = dictDataMap[dictKey]
        if (dictMap == undefined) return ''
        return dictMap[dictCode.toString()]
    }

    return { getDictName }
})

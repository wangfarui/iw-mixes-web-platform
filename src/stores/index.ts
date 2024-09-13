import {defineStore} from 'pinia'
import {reactive} from 'vue';
import type {UserInfoVo} from "@/types/types";

type DictTypeObject = {
    code: number,
    name: string
}

type DictSimpleObject = {
    id: number,
    dictCode: number,
    dictName: string
}

type DictArrayMap = {
    [key: string]: Array<DictSimpleObject>;
};

export const useCommonStore = defineStore('common', () => {

    const userInfo: UserInfoVo = reactive({
        name: ''
    })

    // getDictTypeList
    const dictTypeArray: Array<DictTypeObject> = reactive([])

    // 每一个dictType对应的code都是一个Array
    const dictArrayMap: DictArrayMap = reactive({})

    // 对应服务端的 DictTypeEnum
    // code 就是 DictType#code
    const dictTypeEnum = Object.freeze({
        BASE_DICT_TYPE: 'dictType',
        EAT_MEAL_TIME: '3002', // 餐饮-用餐时间 code
        EAT_DISHES_TYPE: '3003', // 餐饮-菜品分类 code
        EAT_DISHES_STATUS: '3004', // 餐饮-菜品状态 code
        BOOKKEEPING_RECORD_TAG: '4001', // 记账-记录标签 id
        BOOKKEEPING_RECORD_TYPE: '4002', // 记账-记录分类 code
        BOOKKEEPING_RECORD_CATEGORY: '4003' // 记账-记录类型 code
    });

    /**
     * 设置字典类型数组
     * @param data 字典类型对象数组
     */
    function setDictTypeArray(data: Array<DictTypeObject>) {
        dictTypeArray.length = 0
        dictTypeArray.push(...data)
    }

    /**
     * 获取字典类型数组
     */
    function getDictTypeArray() {
        return dictTypeArray
    }

    /**
     * 获取字典类型名称
     * @param code 字典类型code
     */
    function getDictTypeName(code: number) {
        const item = dictTypeArray.find(obj => obj.code === code);
        return item ? item.name : '';
    }

    /**
     * 设置字典数据对象数组的Map
     * @param dictKeyValue (key->DictType#code, value->对象数组)
     */
    function setDictDataArrayMap(dictKeyValue: DictArrayMap) {
        // 遍历数据对象并将其插入到 dictArrayMap 中：
        Object.entries(dictKeyValue).forEach(([key, value]) => {
            dictArrayMap[key] = value;
        });
    }

    /**
     * 根据字典类型 获取数据字典数组
     * @param dictType DictType#code
     */
    function getDictDataArray(dictType: string) {
        return dictArrayMap[dictType]
    }

    /**
     * 根据字典类型和字典id 获取字典名称
     * @param dictType DictType#code
     * @param id DictSimpleObject#id
     */
    function getDictNameById(dictType: string, id: number) {
        let dictArr = dictArrayMap[dictType]
        if (dictArr == undefined) return ''
        const item = dictArr.find(obj => obj.id === id);
        return item ? item.dictName : '';
    }

    /**
     * 根据字典类型和字典code 获取字典名称
     * @param dictType DictType#code
     * @param dictCode DictSimpleObject#dictCode
     */
    function getDictNameByCode(dictType: string, dictCode: number) {
        let dictArr = dictArrayMap[dictType]
        if (dictArr == undefined) return ''
        const item = dictArr.find(obj => obj.dictCode === dictCode);
        return item ? item.dictName : '';
    }

    return {
        userInfo, dictTypeEnum,
        setDictTypeArray, getDictTypeArray, getDictTypeName,
        setDictDataArrayMap, getDictDataArray, getDictNameById, getDictNameByCode
    }
})

import {ref, reactive} from 'vue'
import { defineStore } from 'pinia'
import type {DishesCreationMethodAddDto, DishesMaterialAddDto, DishesUpdateDto} from "@/types/dishes";

export const useDishesStore = defineStore('dishes', () => {
    const operate = ref("add")
    const formData = ref({
        dishesMaterialList: [{}],
        dishesCreationMethodList: [{}]
    } as DishesUpdateDto)

    function initFormData() {
        operate.value = "add"
        formData.value = {
            id: 0,
            dishesName: '',
            dishesImage: '',
            dishesType: 1,
            difficultyFactor: 0,
            useTime: 0,
            prices: 0,
            status: 1,
            dishesMaterialList: [{}] as Array<DishesMaterialAddDto>,
            dishesCreationMethodList: [{}] as Array<DishesCreationMethodAddDto>
        }
    }

    return { operate, formData, initFormData }
})

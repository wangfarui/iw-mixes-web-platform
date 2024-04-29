import {ref, reactive} from 'vue'
import { defineStore } from 'pinia'
import type {DishesUpdateDto} from "@/types/dishes";

export const useDishesStore = defineStore('dishes', () => {
    const operate = ref("add")
    const formData = ref({} as DishesUpdateDto)

    function initFormData() {
        operate.value = "add"
        formData.value = {
            id: 0,
            dishesName: '',
            dishesType: 0,
            difficultyFactor: 0,
            useTime: 0,
            prices: 0,
            status: 1
        }
    }

    return { operate, formData, initFormData }
})

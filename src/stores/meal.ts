import {ref, reactive} from 'vue'
import { defineStore } from 'pinia'
import type {MealMenuAddDto, MealUpdateDto} from "@/types/meal";

export const useMealStore = defineStore('meal', () => {
    const operate = ref("add")
    const formData = ref({} as MealUpdateDto)
    const selectDishes = reactive({
        show: false,
        dishesList: [

        ] as Array<MealMenuAddDto>
    })

    function initFormData() {
        operate.value = "add"
        formData.value = {
            id: 0,
            mealDate: new Date(),
            mealTime: 0,
            diners: 0,
            remark: '',
            mealMenuList: []
        }
    }

    return { operate, formData, selectDishes, initFormData }
})

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export const useCodeStatsMemberChart = (memberCount: () => number) => {
  const viewport = ref<HTMLElement>()
  const viewportWidth = ref(0)
  const chartHeight = 260
  const plotLeft = 58
  const plotRight = 18
  const plotTop = 24
  const plotBottom = 34
  const plotHeight = chartHeight - plotTop - plotBottom
  const chartWidth = computed(() => Math.max(viewportWidth.value, memberCount() * 62 + plotLeft + plotRight))
  const slotWidth = computed(() => (chartWidth.value - plotLeft - plotRight) / Math.max(1, memberCount()))
  const slotX = (index: number) => plotLeft + slotWidth.value * index
  let observer: ResizeObserver | undefined

  onMounted(() => {
    const element = viewport.value
    if (!element) return
    const measure = () => { viewportWidth.value = element.clientWidth }
    observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { viewport, chartWidth, chartHeight, plotLeft, plotRight, plotTop, plotHeight, slotWidth, slotX }
}

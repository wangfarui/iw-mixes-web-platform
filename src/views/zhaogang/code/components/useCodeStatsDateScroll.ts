import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const visibleDays = 7

export const useCodeStatsDateScroll = (enabled: () => boolean, dayCount: () => number, rightPadding: number) => {
  const viewport = ref<HTMLElement>()
  const viewportWidth = ref(0)
  const plotWidth = computed(() => {
    const width = viewportWidth.value
    const extraDays = Math.max(0, dayCount() - visibleDays)
    return Math.round(width + extraDays * Math.max(0, width - rightPadding) / visibleDays)
  })
  let observer: ResizeObserver | undefined
  let atLatest = true

  const trackScroll = () => {
    if (!enabled() || !viewport.value) return
    const { scrollWidth, clientWidth, scrollLeft } = viewport.value
    atLatest = scrollWidth - clientWidth - scrollLeft <= 1
  }

  onMounted(() => {
    const element = viewport.value
    if (!enabled() || !element) return
    const measure = () => { viewportWidth.value = element.clientWidth }
    observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
  })
  onBeforeUnmount(() => observer?.disconnect())

  watch(plotWidth, () => {
    if (atLatest && viewport.value) viewport.value.scrollLeft = viewport.value.scrollWidth
  }, { flush: 'post' })

  return { viewport, plotWidth, trackScroll }
}

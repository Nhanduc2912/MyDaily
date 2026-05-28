import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import relativeTime from 'dayjs/plugin/relativeTime'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

dayjs.extend(relativeTime)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.locale('vi')

export default dayjs

/**
 * Get the "MyDaily day" date for a given timestamp.
 * A day starts at 5:00 AM and ends at 4:59 AM the next day.
 */
export function getMyDailyDate(date = new Date()) {
  const d = dayjs(date)
  if (d.hour() < 5) {
    return d.subtract(1, 'day').format('YYYY-MM-DD')
  }
  return d.format('YYYY-MM-DD')
}

/**
 * Format relative time in Vietnamese
 */
export function fromNow(date) {
  return dayjs(date).fromNow()
}

/**
 * Format time as HH:mm
 */
export function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

/**
 * Format full date in Vietnamese style
 */
export function formatDate(date) {
  return dayjs(date).format('dddd, D MMMM YYYY')
}

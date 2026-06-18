import { request } from '../../shared/api/request'

export const getPublicConfig = (activityKey) => request(`/activities/${activityKey}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey) => request(`/appointment/activities/${activityKey}/bootstrap`)

export const verifyAppointment = (activityKey, data) =>
  request(`/appointment/activities/${activityKey}/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const createAppointmentBooking = (activityKey, data) =>
  request(`/appointment/activities/${activityKey}/bookings`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const resetAppointmentDebugData = (data) =>
  request('/appointment/dev/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  })

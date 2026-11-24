
import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser

  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const getUsers = () =>
  api.get('/admin/users').then((r) => r.data)

export const setUserActive = (uid, isActive) =>
  api.put(`/admin/users/${uid}/status`, { isActive })

export const approveMerchant = (uid) =>
  api.put(`/admin/merchants/${uid}/approve`)

export const rejectMerchant = (uid) =>
  api.put(`/admin/merchants/${uid}/reject`)

export const registerUser = (data) =>
  api.post('/auth/register', data).then((r) => r.data)

export const getOffers = () =>
  api.get('/offers').then((r) => r.data)

export const createOffer = (data) =>
  api.post('/offers', data).then((r) => r.data)

export const updateOffer = (id, data) =>
  api.put(`/offers/${id}`, data)

export const deleteOffer = (id) =>
  api.delete(`/offers/${id}`)

export const getSurpriseBaskets = () =>
  api.get('/surprise-baskets').then((r) => r.data)

export const getMySurpriseBaskets = () =>
  api.get('/surprise-baskets/my-baskets').then((r) => r.data)

export const createSurpriseBasket = (data) =>
  api.post('/surprise-baskets', data).then((r) => r.data)

export const updateSurpriseBasket = (id, data) =>
  api.put(`/surprise-baskets/${id}`, data)

export const deleteSurpriseBasket = (id) =>
  api.delete(`/surprise-baskets/${id}`)

export const createOrder = (data) =>
  api.post('/orders', data).then((r) => r.data)

export const getMyOrders = () =>
  api.get('/orders/my-orders').then((r) => r.data)

export const getMerchantOrders = () =>
  api.get('/orders/merchant-orders').then((r) => r.data)

export const updateOrderStatus = (id, status) =>
  api.put(`/orders/${id}/status`, { status })

export const updateProfile = (data) =>
  api.put('/auth/me', data).then((r) => r.data)

export const getAllOrders = () =>
  api.get('/admin/orders').then((r) => r.data)

export const createSurpriseBasketOrder = (data) =>
  api.post('/surprise-basket-orders', data).then((r) => r.data)

export const getMySurpriseBasketOrders = () =>
  api.get('/surprise-basket-orders/my-orders').then((r) => r.data)

export const getMerchantSurpriseBasketOrders = () =>
  api.get('/surprise-basket-orders/merchant-orders').then((r) => r.data)

export const updateSurpriseBasketOrderStatus = (id, status) =>
  api.put(`/surprise-basket-orders/${id}/status`, { status })

export const getRadarMerchants = () =>
  api.get('/merchants/radar').then((r) => r.data)


export const initPayment = (orderId, orderType = 'classic') =>
  api.post('/payments/init', { orderId, orderType }).then((r) => r.data)

export const getPaymentStatus = (orderId, orderType = 'classic') =>
  api
    .get(`/payments/${orderId}/status`, {
      params: { orderType }
    })
    .then((r) => r.data)




export const getOrderQr = (orderId, orderType = 'classic') =>
  api
    .get(`/qr/${orderId}`, {
      params: { orderType }
    })
    .then((r) => r.data)

export const validateQr = (token) =>
  api.post('/qr/validate', { token }).then((r) => r.data)

export const getNotifications = () =>
  api.get('/notifications').then((r) => r.data)

export const markNotificationRead = (notificationId) =>
  api.patch(`/notifications/${notificationId}/read`).then((r) => r.data)

export const markAllNotificationsRead = () =>
  api.patch('/notifications/read-all').then((r) => r.data)

export const saveFcmToken = (fcmToken) =>
  api.post('/notifications/token', { fcmToken }).then((r) => r.data)
export default api


import { useEffect, useState } from 'react'
import {
  ShoppingBag,
  Wallet,
  Tag,
  Clock,
  Bell,
  CheckCheck,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  getMerchantOrders,
  getOffers,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function MerchantDashboard() {
  const { user } = useAuth()

  const [orders, setOrders] = useState([])
  const [activeOffers, setActiveOffers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)

    Promise.all([getMerchantOrders(), getOffers()])
      .then(([list, offers]) => {
        setOrders(list)
        setActiveOffers(
          offers.filter(
            (o) => o.merchantId === user?.uid && o.quantity > 0
          ).length
        )
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Erreur de chargement des notifications :', err)
    }
  }

  useEffect(() => {
    if (!user) return

    load()
    loadNotifications()

    const interval = setInterval(loadNotifications, 15000)

    return () => clearInterval(interval)
  }, [user])

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId)
      await loadNotifications()
    } catch (err) {
      console.error('Erreur lors de la lecture :', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      await loadNotifications()
    } catch (err) {
      console.error('Erreur lors du marquage :', err)
    }
  }

  const valid = orders.filter((o) => o.status !== 'cancelled')
  const revenue = valid.reduce(
    (s, o) => s + Number(o.totalPrice || 0),
    0
  )
  const pending = orders.filter((o) => o.status === 'pending').length

  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))

    return {
      key: d.toISOString().slice(0, 10),
      jour: d.toLocaleDateString('fr-FR', {
        weekday: 'short',
      }),
      commandes: 0,
    }
  })

  valid.forEach((o) => {
    const d = days.find(
      (x) => x.key === String(o.createdAt).slice(0, 10)
    )
    if (d) d.commandes++
  })

  const stats = [
    {
      label: 'Commandes reçues',
      value: valid.length,
      icon: ShoppingBag,
      color: '',
    },
    {
      label: "Chiffre d'affaires",
      value: revenue.toFixed(2) + ' DT',
      icon: Wallet,
      color: 'orange',
    },
    {
      label: 'Offres actives',
      value: activeOffers,
      icon: Tag,
      color: '',
    },
    {
      label: 'En attente',
      value: pending,
      icon: Clock,
      color: 'red',
    },
  ]

  return (
    <>
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          zIndex: 1001,
        }}
      >
        <div>
          <h1>Tableau de bord</h1>
          <p>Activité de votre commerce</p>
        </div>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Afficher les notifications"
          style={{
            position: 'relative',
            border: '1px solid #e5e7eb',
            background: '#fff',
            borderRadius: 12,
            width: 46,
            height: 46,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#333',
            flexShrink: 0,
          }}
        >
          <Bell size={22} />

          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#e53935',
                color: '#fff',
                borderRadius: 20,
                minWidth: 19,
                height: 19,
                padding: '0 4px',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {showNotifications && (
        <>
          <div
            onClick={() => setShowNotifications(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'transparent',
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: 105,
              right: 25,
              width: 360,
              maxWidth: 'calc(100vw - 32px)',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              zIndex: 10001,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: 15,
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <strong>Notifications</strong>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#168653',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <CheckCheck size={15} />
                  Tout lire
                </button>
              )}
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    color: '#777',
                    fontSize: 14,
                  }}
                >
                  Aucune notification pour le moment.
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: 14,
                      borderBottom: '1px solid #f0f0f0',
                      background: notification.read ? '#fff' : '#f0faf5',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>
                        {notification.title}
                      </strong>

                      <p
                        style={{
                          margin: '5px 0',
                          fontSize: 13,
                          color: '#555',
                        }}
                      >
                        {notification.body}
                      </p>

                      <small style={{ color: '#999' }}>
                        {notification.createdAt
                          ? new Date(notification.createdAt).toLocaleString('fr-FR')
                          : ''}
                      </small>
                    </div>

                    {!notification.read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        title="Marquer comme lue"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#168653',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        <CheckCheck size={18} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {loading ? (
        'Chargement...'
      ) : error ? (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <div className="badge badge-red">
            Impossible de joindre le serveur
          </div>
          <div>
            <button className="btn btn-primary" onClick={load}>
              Réessayer
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div className="card stat-card" key={label}>
                <div className={'stat-icon ' + color}>
                  <Icon size={22} />
                </div>
                <div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>
              Commandes des 7 derniers jours
            </h3>

            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days}>
                  <defs>
                    <linearGradient
                      id="gm"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#1f9d63"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="#1f9d63"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="jour"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="commandes"
                    stroke="#1f9d63"
                    strokeWidth={3}
                    fill="url(#gm)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  )
}
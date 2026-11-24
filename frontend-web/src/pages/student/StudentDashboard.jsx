
import { useEffect, useState } from 'react'
import {
  ShoppingBag,
  Wallet,
  PiggyBank,
  Clock,
  Leaf,
  Award,
  Utensils,
  Bell,
  CheckCheck,
} from 'lucide-react'
import {
  getMyOrders,
  getOffers,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const POINTS_PER_PORTION = 10
const KG_PER_PORTION = 0.4

const badge = {
  pending: ['badge-orange', 'En attente'],
  accepted: ['badge-green', 'Acceptée'],
  confirmed: ['badge-green', 'Confirmée'],
  rejected: ['badge-red', 'Refusée'],
  ready: ['badge-green', 'Prête'],
  completed: ['badge-green', 'Récupérée'],
  cancelled: ['badge-red', 'Annulée'],
}

export default function StudentDashboard() {
  const { user } = useAuth()

  const [orders, setOrders] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)

    Promise.all([getMyOrders(), getOffers().catch(() => [])])
      .then(([list, offers]) => {
        setOrders(list)

        const map = {}
        offers.forEach((o) => {
          map[o.id] = o.originalPrice
        })

        setPrices(map)
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

  const spent = valid.reduce(
    (s, o) => s + Number(o.totalPrice || 0),
    0
  )

  const saved = valid.reduce((s, o) => {
    const orig = Number(
      o.originalPrice ?? prices[o.offerId] ?? o.unitPrice ?? 0
    )

    return s + Math.max(
      0,
      (orig - Number(o.unitPrice || 0)) * Number(o.quantity || 0)
    )
  }, 0)

  const active = orders.filter((o) =>
    ['pending', 'accepted', 'confirmed', 'ready'].includes(o.status)
  ).length

  const recent = [...orders]
    .sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    )
    .slice(0, 5)

  const picked = orders.filter((o) => o.status === 'completed')
  const meals = picked.reduce(
    (s, o) => s + Number(o.quantity || 0),
    0
  )
  const kg = meals * KG_PER_PORTION
  const ecoPoints = Number(user?.ecoPoints ?? meals * POINTS_PER_PORTION)

  const stats = [
    {
      label: 'Commandes',
      value: valid.length,
      icon: ShoppingBag,
      color: '',
    },
    {
      label: 'Total dépensé',
      value: spent.toFixed(2) + ' DT',
      icon: Wallet,
      color: 'orange',
    },
    {
      label: 'Économies réalisées',
      value: saved.toFixed(2) + ' DT',
      icon: PiggyBank,
      color: '',
    },
    {
      label: 'En cours',
      value: active,
      icon: Clock,
      color: 'red',
    },
  ]

  const impact = [
    {
      label: 'Repas sauvés',
      value: meals,
      icon: Utensils,
      color: '',
    },
    {
      label: 'Gaspillage évité',
      value: kg.toFixed(1) + ' kg',
      icon: Leaf,
      color: '',
    },
    {
      label: 'EcoPoints',
      value: ecoPoints,
      icon: Award,
      color: 'orange',
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
          <h1>Mon tableau de bord</h1>
          <p>Bonjour {user?.name || ''}</p>
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

          <h3 style={{ marginBottom: 12 }}>Mon impact</h3>

          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            {impact.map(({ label, value, icon: Icon, color }) => (
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

          <div className="card table-wrap">
            <h3 style={{ marginBottom: 12 }}>Dernières commandes</h3>

            {recent.length === 0 ? (
              'Aucune commande pour le moment.'
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Offre</th>
                    <th>Qté</th>
                    <th>Total</th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {recent.map((o) => {
                    const [cls, label] = badge[o.status] || [
                      'badge-orange',
                      o.status,
                    ]

                    return (
                      <tr key={o.id}>
                        <td>{o.offerTitle}</td>
                        <td>{o.quantity}</td>
                        <td>
                          <b>{Number(o.totalPrice).toFixed(2)} DT</b>
                        </td>
                        <td>
                          <span className={'badge ' + cls}>
                            {label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  )
}
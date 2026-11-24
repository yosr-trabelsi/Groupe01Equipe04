
import { useEffect, useState } from 'react'
import { getAllOrders } from '../../services/api'

const badge = {
  pending: ['badge-orange', 'En attente'],
  confirmed: ['badge-blue', 'Confirmée'],
  ready: ['badge-green', 'Prête'],
  completed: ['badge-green', 'Récupérée'],
  cancelled: ['badge-red', 'Annulée'],
}

export default function ManageOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await getAllOrders()

        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.orders)
            ? response.orders
            : []

        // Trier les commandes de la plus ancienne à la plus récente
        const sortedOrders = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()

          return dateA - dateB
        })

        setOrders(sortedOrders)

      } catch (err) {
        console.error('Erreur chargement commandes :', err)
        console.error('Réponse serveur :', err.response?.data)

        setError(
          err.response?.data?.error ||
          'Impossible de récupérer les commandes.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  // Afficher le statut
  const getStatus = (status) => {
    const normalized = String(status || '').toLowerCase()

    return badge[normalized] || ['badge-orange', 'Inconnu']
  }

  // Nom de l'étudiant
  const getStudent = (order) =>
    order.studentName ||
    order.student?.name ||
    order.userName ||
    order.user?.name ||
    'Étudiant inconnu'

  // Nom du commerce
  const getShop = (order) =>
    order.businessName ||
    order.shopName ||
    order.merchantName ||
    order.merchant?.businessName ||
    'Commerce inconnu'

  // Total de la commande
  const getTotal = (order) => {
    const total =
      order.totalPrice ??
      order.total ??
      order.totalAmount ??
      order.amount

    if (total === undefined || total === null) {
      return '—'
    }

    return `${Number(total).toFixed(3)} DT`
  }

  // Numéro de commande
  const getOrderNumber = (order, index) => {
    if (order.orderNumber) {
      return order.orderNumber
    }

    // Numéro d'affichage temporaire pour les anciennes commandes
    return `CMD-${String(index + 1).padStart(4, '0')}`
  }

  // Identifiant Firebase utilisé uniquement pour React
  const getOrderId = (order) =>
    order.id || order.orderId || order._id

  // Filtrer les commandes
  const shown = orders
    .map((order, index) => ({ ...order, displayIndex: index }))
    .filter(({ status }) => {
      if (filter === 'all') return true

      if (filter === 'collected') {
        return status === 'completed'
      }

      return status === filter
    })

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Commandes</h1>
          <p>Suivi de toutes les commandes</p>
        </div>

        <select
          className="input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Toutes</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmées</option>
          <option value="ready">Prêtes</option>
          <option value="collected">Récupérées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <p>Chargement des commandes...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : shown.length === 0 ? (
          <p>Aucune commande trouvée.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Étudiant</th>
                <th>Commerce</th>
                <th>Total</th>
                <th>Statut</th>
              </tr>
            </thead>

            <tbody>
              {shown.map((order) => {
                const status = getStatus(order.status)

                return (
                  <tr key={getOrderId(order) || order.displayIndex}>
                    <td>
                      <b>
                        {getOrderNumber(order, order.displayIndex)}
                      </b>
                    </td>

                    <td>{getStudent(order)}</td>

                    <td>{getShop(order)}</td>

                    <td>{getTotal(order)}</td>

                    <td>
                      <span className={`badge ${status[0]}`}>
                        {status[1]}
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
  )
}

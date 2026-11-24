
import { useEffect, useState } from 'react'
import { Check, X, PackageCheck } from 'lucide-react'
import {
  getMerchantOrders,
  updateOrderStatus,
  getMerchantSurpriseBasketOrders,
  updateSurpriseBasketOrderStatus
} from '../../services/api'

const badge = {
  pending: ['badge-orange', 'En attente'],
  accepted: ['badge-green', 'Acceptée'],
  rejected: ['badge-red', 'Refusée'],
  ready: ['badge-green', 'Prête'],
  completed: ['badge-green', 'Récupérée'],
  cancelled: ['badge-red', 'Annulée'],
}

const byDate = (a, b) =>
  String(b.createdAt || '').localeCompare(String(a.createdAt || ''))

export default function MerchantOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [processingId, setProcessingId] = useState(null)

  const load = () => {
    setLoading(true)
    setError(false)

    Promise.all([
      getMerchantOrders(),
      getMerchantSurpriseBasketOrders()
    ])
      .then(([classicOrders, basketOrders]) => {
        const combined = [
          ...classicOrders.map((o) => ({
            ...o,
            orderType: 'classic'
          })),
          ...basketOrders.map((o) => ({
            ...o,
            orderType: 'surprise'
          }))
        ]

        setOrders(combined)
      })
      .catch((err) => {
        console.error('Erreur chargement des commandes :', err)
        console.error('Réponse backend :', err.response?.data)
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const change = async (id, status, orderType) => {
    const key = `${orderType}:${id}`

    setProcessingId(key)

    try {
      if (orderType === 'surprise') {
        await updateSurpriseBasketOrderStatus(id, status)
      } else {
        await updateOrderStatus(id, status)
      }

      setOrders((list) =>
        list.map((o) =>
          o.id === id && o.orderType === orderType
            ? { ...o, status }
            : o
        )
      )
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'Erreur lors de la modification.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  const sorted = [...orders].sort(byDate)
  const pending = orders.filter((o) => o.status === 'pending').length

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Commandes reçues</h1>
          <p>{pending} en attente de validation</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={load}
          disabled={loading}
        >
          Actualiser
        </button>
      </div>

      <div className="card table-wrap">
        {loading ? 'Chargement...' : error ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="badge badge-red">
              Impossible de joindre le serveur
            </div>
            <div>
              <button className="btn btn-primary" onClick={load}>
                Réessayer
              </button>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          'Aucune commande.'
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Offre / Panier</th>
                <th>Étudiant</th>
                <th>Qté</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Paiement</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((o) => {
                const [cls, label] = badge[o.status] || [
                  'badge-orange',
                  o.status
                ]

                const isSurprise = o.orderType === 'surprise'
                const key = `${o.orderType}:${o.id}`
                const processing = processingId === key

                return (
                  <tr key={key}>
                    <td>
                      <span className="badge badge-orange">
                        {isSurprise
                          ? 'Panier surprise'
                          : 'Commande classique'}
                      </span>
                    </td>

                    <td>
                      {isSurprise ? o.basketTitle : o.offerTitle}
                      <small
                        style={{
                          display: 'block',
                          color: 'var(--muted)'
                        }}
                      >
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleString('fr-FR')
                          : '—'}
                      </small>
                    </td>

                    <td>{o.studentName || 'Étudiant'}</td>

                    <td>{o.quantity}</td>

                    <td>
                      <b>{Number(o.totalPrice || 0).toFixed(2)} DT</b>
                    </td>

                    <td>
                      <span className={'badge ' + cls}>
                        {label}
                      </span>
                    </td>

                    <td>
                      {o.paymentStatus === 'paid' ? (
                        <span className="badge badge-green">Payé</span>
                      ) : o.status === 'accepted' ? (
                        <span className="badge badge-orange">
                          En attente de paiement
                        </span>
                      ) : (
                        <span className="badge badge-orange">
                          Non payé
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap'
                      }}>
                        {o.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={processing}
                              onClick={() =>
                                change(o.id, 'accepted', o.orderType)
                              }
                            >
                              <Check size={14} /> Accepter
                            </button>

                            <button
                              className="btn btn-sm btn-danger"
                              disabled={processing}
                              onClick={() =>
                                change(o.id, 'rejected', o.orderType)
                              }
                            >
                              <X size={14} /> Refuser
                            </button>
                          </>
                        )}

                        {o.status === 'accepted' && (
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={processing || o.paymentStatus !== 'paid'}
                            title={
                              o.paymentStatus !== 'paid'
                                ? 'En attente du paiement étudiant'
                                : 'Marquer comme prête'
                            }
                            onClick={() =>
                              change(o.id, 'ready', o.orderType)
                            }
                          >
                            <PackageCheck size={14} /> Prête
                          </button>
                        )}

                        {o.status === 'ready' && (
                          <span className="badge badge-orange">
                            En attente du scan QR
                          </span>
                        )}

                        {['rejected', 'completed', 'cancelled'].includes(o.status) &&
                          '—'}
                      </div>
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


import { useEffect, useState } from 'react'
import {
  getMyOrders,
  getMySurpriseBasketOrders,
  initPayment,
  getPaymentStatus,
  getOrderQr,
} from '../../services/api'

const badge = {
  pending: ['badge-orange', 'En attente'],
  accepted: ['badge-green', 'Acceptée'],
  rejected: ['badge-red', 'Refusée'],
  ready: ['badge-green', 'Prête'],
  completed: ['badge-green', 'Récupérée'],
  cancelled: ['badge-red', 'Annulée'],
  confirmed: ['badge-green', 'Acceptée'],
}

const byDate = (a, b) =>
  String(b.createdAt || '').localeCompare(String(a.createdAt || ''))

const getOrderKey = order => `${order.orderType}:${order.id}`

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [qrCodes, setQrCodes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [checkingId, setCheckingId] = useState(null)
  const [actionError, setActionError] = useState('')

  const load = async () => {
    setLoading(true)
    setError(false)
    setActionError('')
    setQrCodes({})

    try {
      const [classicResult, surpriseResult] = await Promise.allSettled([
        getMyOrders(),
        getMySurpriseBasketOrders(),
      ])

      if (
        classicResult.status === 'rejected' &&
        surpriseResult.status === 'rejected'
      ) {
        throw new Error('Impossible de charger les commandes')
      }

      const classicOrders =
        classicResult.status === 'fulfilled'
          ? (classicResult.value || []).map(order => ({
              ...order,
              orderType: 'classic',
            }))
          : []

      const surpriseOrders =
        surpriseResult.status === 'fulfilled'
          ? (surpriseResult.value || []).map(order => ({
              ...order,
              orderType: 'surprise',
            }))
          : []

      const allOrders = [...classicOrders, ...surpriseOrders].sort(byDate)

      setOrders(allOrders)

      const paidOrders = allOrders.filter(
        order =>
          order.paymentStatus === 'paid' &&
          !['completed', 'cancelled', 'rejected'].includes(order.status)
      )

      const qrResults = await Promise.allSettled(
        paidOrders.map(async order => {
          const result = await getOrderQr(order.id, order.orderType)

          return {
            key: getOrderKey(order),
            qrImage: result.qrImage,
          }
        })
      )

      const newQrCodes = {}

      qrResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.qrImage) {
          newQrCodes[result.value.key] = result.value.qrImage
        }
      })

      setQrCodes(newQrCodes)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handlePayment = async order => {
    if (
      order.status !== 'accepted' &&
      order.status !== 'confirmed'
    ) {
      return
    }

    if (
      order.paymentStatus === 'paid' ||
      ['completed', 'cancelled', 'rejected'].includes(order.status)
    ) {
      return
    }

    if (order.paymentStatus === 'pending') {
      setActionError('Un paiement est déjà en cours. Vérifiez son état.')
      return
    }

    const key = getOrderKey(order)

    setPayingId(key)
    setActionError('')

    try {
      const result = await initPayment(order.id, order.orderType)

      if (result.paymentStatus === 'paid') {
        setOrders(previous =>
          previous.map(item =>
            getOrderKey(item) === key
              ? {
                  ...item,
                  paymentStatus: 'paid',
                  status: result.status || item.status,
                }
              : item
          )
        )

        const qr = await getOrderQr(order.id, order.orderType)

        setQrCodes(previous => ({
          ...previous,
          [key]: qr.qrImage,
        }))
      } else if (result.payUrl) {
        setOrders(previous =>
          previous.map(item =>
            getOrderKey(item) === key
              ? { ...item, paymentStatus: 'pending' }
              : item
          )
        )

        window.open(result.payUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error(err)
      setActionError(
        err.response?.data?.message || 'Impossible de lancer le paiement.'
      )
    } finally {
      setPayingId(null)
    }
  }

  const checkPayment = async order => {
    if (
      order.status !== 'accepted' &&
      order.status !== 'confirmed'
    ) {
      return
    }

    const key = getOrderKey(order)

    setCheckingId(key)
    setActionError('')

    try {
      const result = await getPaymentStatus(order.id, order.orderType)

      if (result.paymentStatus === 'paid') {
        setOrders(previous =>
          previous.map(item =>
            getOrderKey(item) === key
              ? {
                  ...item,
                  paymentStatus: 'paid',
                  status: result.status || item.status,
                }
              : item
          )
        )

        const qr = await getOrderQr(order.id, order.orderType)

        setQrCodes(previous => ({
          ...previous,
          [key]: qr.qrImage,
        }))
      } else {
        setActionError('Le paiement n’est pas encore confirmé.')
      }
    } catch (err) {
      console.error(err)
      setActionError(
        err.response?.data?.message || 'Impossible de vérifier le paiement.'
      )
    } finally {
      setCheckingId(null)
    }
  }

  const sorted = [...orders].sort(byDate)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Mes commandes</h1>
          <p>{sorted.length} réservation(s)</p>
        </div>

        <button className="btn btn-primary" onClick={load} disabled={loading}>
          Actualiser
        </button>
      </div>

      {actionError && (
        <div className="badge badge-red" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      <div className="card table-wrap">
        {loading ? (
          'Chargement...'
        ) : error ? (
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
          'Aucune réservation pour le moment.'
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Offre / Panier</th>
                <th>Qté</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Paiement</th>
                <th>Date</th>
                <th>QR Code</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map(order => {
                const [cls, label] = badge[order.status] || [
                  'badge-orange',
                  order.status || 'Inconnu',
                ]

                const key = getOrderKey(order)
                const isPaid = order.paymentStatus === 'paid'
                const isPending = order.status === 'pending'
                const isAccepted =
                  order.status === 'accepted' ||
                  order.status === 'confirmed'
                const isRejected = order.status === 'rejected'
                const isCancelled = order.status === 'cancelled'
                const isCompleted = order.status === 'completed'
                const isTerminal =
                  isRejected || isCancelled || isCompleted
                const isPaymentPending =
                  order.paymentStatus === 'pending'
                const qrImage = qrCodes[key]

                return (
                  <tr key={key}>
                    <td>
                      <span className="badge badge-green">
                        {order.orderType === 'surprise'
                          ? 'Panier surprise'
                          : 'Offre'}
                      </span>
                    </td>

                    <td>
                      {order.orderType === 'surprise'
                        ? order.basketTitle
                        : order.offerTitle}

                      {order.businessName && (
                        <small
                          style={{
                            display: 'block',
                            color: 'var(--muted)',
                          }}
                        >
                          {order.businessName}
                        </small>
                      )}
                    </td>

                    <td>{order.quantity}</td>

                    <td>
                      <b>
                        {Number(order.totalPrice || 0).toFixed(2)} DT
                      </b>
                    </td>

                    <td>
                      <span className={'badge ' + cls}>{label}</span>
                    </td>

                    <td>
                      {isPaid ? (
                        <span className="badge badge-green">Payé</span>
                      ) : isRejected ? (
                        <span className="badge badge-red">Non payé</span>
                      ) : isCancelled ? (
                        <span className="badge badge-red">Annulé</span>
                      ) : isCompleted ? (
                        <span className="badge badge-green">Payé</span>
                      ) : isPending ? (
                        <span className="badge badge-orange">
                          En attente de validation
                        </span>
                      ) : isPaymentPending ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <span className="badge badge-orange">
                            Paiement en cours
                          </span>

                          <button
                            className="btn btn-secondary"
                            disabled={checkingId === key}
                            onClick={() => checkPayment(order)}
                          >
                            {checkingId === key
                              ? 'Vérification...'
                              : 'Vérifier le paiement'}
                          </button>
                        </div>
                      ) : isAccepted ? (
                        <button
                          className="btn btn-primary"
                          disabled={payingId === key}
                          onClick={() => handlePayment(order)}
                        >
                          {payingId === key ? 'Traitement...' : 'Payer'}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString('fr-FR')
                        : '—'}
                    </td>

                    <td>
                      {isPaid && !isTerminal ? (
                        qrImage ? (
                          <div
                            style={{
                              display: 'grid',
                              justifyItems: 'center',
                              gap: 8,
                              minWidth: 140,
                            }}
                          >
                            <img
                              src={qrImage}
                              alt="QR Code de récupération"
                              style={{
                                width: 130,
                                height: 130,
                                objectFit: 'contain',
                              }}
                            />

                            <small style={{ color: 'var(--muted)' }}>
                              Présentez ce QR Code au commerçant
                            </small>
                          </div>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            onClick={() => checkPayment(order)}
                            disabled={checkingId === key}
                          >
                            Afficher le QR Code
                          </button>
                        )
                      ) : isCompleted ? (
                        <span className="badge badge-green">
                          Récupérée
                        </span>
                      ) : isCancelled || isRejected ? (
                        '—'
                      ) : (
                        'Disponible après paiement'
                      )}
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

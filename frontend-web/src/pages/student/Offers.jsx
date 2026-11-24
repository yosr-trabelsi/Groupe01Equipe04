
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Store, Clock } from 'lucide-react'
import {
  getOffers,
  createOrder,
  getSurpriseBaskets,
  createSurpriseBasketOrder
} from '../../services/api'

const CATEGORIES = [
  'boulangerie',
  'restaurant',
  'cafeteria',
  'epicerie',
  'patisserie',
  'autre'
]

export default function Offers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const merchantId = searchParams.get('merchant')

  const [activeTab, setActiveTab] = useState('offers')

  const [offers, setOffers] = useState([])
  const [baskets, setBaskets] = useState([])

  const [loading, setLoading] = useState(true)
  const [basketLoading, setBasketLoading] = useState(true)

  const [error, setError] = useState(false)
  const [basketError, setBasketError] = useState(false)

  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const [reserving, setReserving] = useState(null)
  const [qty, setQty] = useState(1)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadOffers = () => {
    setLoading(true)
    setError(false)

    getOffers()
      .then(setOffers)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const loadBaskets = () => {
    setBasketLoading(true)
    setBasketError(false)

    getSurpriseBaskets()
      .then(setBaskets)
      .catch(() => setBasketError(true))
      .finally(() => setBasketLoading(false))
  }

  useEffect(() => {
    loadOffers()
    loadBaskets()
  }, [])

  const shownOffers = offers.filter((o) =>
    (!merchantId || o.merchantId === merchantId) &&
    ((o.title || '') + ' ' + (o.businessName || '') + ' ' + (o.description || ''))
      .toLowerCase().includes(q.toLowerCase()) &&
    (category === '' || (o.category || 'autre') === category) &&
    (maxPrice === '' || Number(o.price) <= Number(maxPrice))
  )

  const shownBaskets = baskets.filter((b) =>
    (!merchantId || b.merchantId === merchantId) &&
    ((b.title || '') + ' ' + (b.businessName || '') + ' ' + (b.description || ''))
      .toLowerCase().includes(q.toLowerCase()) &&
    (category === '' || (b.category || 'autre') === category) &&
    (maxPrice === '' || Number(b.discountedPrice) <= Number(maxPrice))
  )

  const startReserve = (type, item) => {
    setMsg(null)
    setQty(1)
    setReserving(`${type}:${item.id}`)
  }

  const confirm = async (item, type) => {
    setBusy(true)
    setMsg(null)

    try {
      if (type === 'offer') {
        await createOrder({
          offerId: item.id,
          quantity: qty
        })

        setOffers((list) =>
          list.map((o) =>
            o.id === item.id
              ? { ...o, quantity: o.quantity - qty }
              : o
          )
        )
      } else {
        await createSurpriseBasketOrder({
          basketId: item.id,
          quantity: qty
        })

        setBaskets((list) =>
          list.map((b) =>
            b.id === item.id
              ? {
                  ...b,
                  remainingQuantity: Number(b.remainingQuantity) - qty
                }
              : b
          )
        )
      }

      setReserving(null)

      setMsg({
        ok: true,
        text: `Réservation confirmée : ${qty} × ${item.title}`
      })
    } catch (err) {
      console.error('Erreur réservation :', err)
      console.error('Réponse backend :', err.response?.data)

      setMsg({
        ok: false,
        text:
          err.response?.data?.error ||
          err.message ||
          'Erreur inconnue lors de la réservation.'
      })
    } finally {
      setBusy(false)
    }
  }

  const renderReservation = (item, type, available, price) => {
    const reservationId = `${type}:${item.id}`

    if (reserving === reservationId) {
      return (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              type="number"
              min="1"
              max={available}
              style={{ width: 80 }}
              value={qty}
              onChange={(e) =>
                setQty(
                  Math.max(
                    1,
                    Math.min(available, Number(e.target.value) || 1)
                  )
                )
              }
            />
            <span className="stat-label">
              Total : <b>{(price * qty).toFixed(2)} DT</b>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled={busy}
              onClick={() => confirm(item, type)}
            >
              {busy ? '...' : 'Confirmer'}
            </button>

            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setReserving(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      )
    }

    return (
      <button
        className="btn btn-primary"
        style={{ justifyContent: 'center' }}
        disabled={available <= 0}
        onClick={() => startReserve(type, item)}
      >
        Réserver
      </button>
    )
  }

  const renderOffers = () => {
    if (loading) return <div className="card">Chargement des offres...</div>

    if (error) {
      return (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <div className="badge badge-red">
            Impossible de joindre le serveur.
          </div>
          <button className="btn btn-primary" onClick={loadOffers}>
            Réessayer
          </button>
        </div>
      )
    }

    if (shownOffers.length === 0) {
      return <div className="card">Aucune offre trouvée pour ce commerce.</div>
    }

    return (
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
      >
        {shownOffers.map((o) => {
          const off = Math.round((1 - o.price / o.originalPrice) * 100)
          const available = Number(o.quantity) || 0

          return (
            <div className="card stat-card" key={o.id}>
              {o.imageUrl && (
                <img
                  src={o.imageUrl}
                  alt={o.title}
                  style={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 10
                  }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="badge badge-orange">-{off}%</span>
                <span className={'badge ' + (available > 0 ? 'badge-green' : 'badge-red')}>
                  {available > 0 ? `${available} restant(s)` : 'Épuisé'}
                </span>
              </div>

              <h3>{o.title}</h3>

              <div className="stat-label" style={{ display: 'flex', gap: 6 }}>
                <Store size={15} />
                {o.businessName} · {o.category || 'autre'}
              </div>

              <div>
                <span style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: 'var(--primary)'
                }}>
                  {o.price} DT
                </span>{' '}
                <s className="stat-label">{o.originalPrice} DT</s>
              </div>

              {o.pickupStart && o.pickupEnd && (
                <div className="stat-label" style={{ display: 'flex', gap: 6 }}>
                  <Clock size={15} />
                  Récupération : {o.pickupStart}–{o.pickupEnd}
                </div>
              )}

              {o.expirationDate && (
                <div className="stat-label">
                  À récupérer avant le {o.expirationDate}
                </div>
              )}

              {renderReservation(o, 'offer', available, Number(o.price))}
            </div>
          )
        })}
      </div>
    )
  }

  const renderBaskets = () => {
    if (basketLoading) {
      return <div className="card">Chargement des paniers surprises...</div>
    }

    if (basketError) {
      return (
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <div className="badge badge-red">
            Impossible de récupérer les paniers surprises.
          </div>
          <button className="btn btn-primary" onClick={loadBaskets}>
            Réessayer
          </button>
        </div>
      )
    }

    if (shownBaskets.length === 0) {
      return <div className="card">Aucun panier surprise disponible pour ce commerce.</div>
    }

    return (
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
      >
        {shownBaskets.map((b) => {
          const off = Math.round(
            (1 - b.discountedPrice / b.originalPrice) * 100
          )

          const available = Number(b.remainingQuantity) || 0

          return (
            <div className="card stat-card" key={b.id}>
              {b.imageUrl && (
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  style={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 10
                  }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="badge badge-orange">-{off}%</span>
                <span className={'badge ' + (available > 0 ? 'badge-green' : 'badge-red')}>
                  {available > 0 ? `${available} restant(s)` : 'Épuisé'}
                </span>
              </div>

              <h3>{b.title}</h3>

              {b.description && (
                <p className="stat-label">{b.description}</p>
              )}

              <div className="stat-label" style={{ display: 'flex', gap: 6 }}>
                <Store size={15} />
                {b.businessName} · {b.category || 'autre'}
              </div>

              <div>
                <span style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: 'var(--primary)'
                }}>
                  {b.discountedPrice} DT
                </span>{' '}
                <s className="stat-label">{b.originalPrice} DT</s>
              </div>

              {b.pickupStart && b.pickupEnd && (
                <div className="stat-label" style={{ display: 'flex', gap: 6 }}>
                  <Clock size={15} />
                  Retrait : {b.pickupStart}–{b.pickupEnd}
                </div>
              )}

              {renderReservation(
                b,
                'basket',
                available,
                Number(b.discountedPrice)
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const currentCount = activeTab === 'offers'
    ? shownOffers.length
    : shownBaskets.length

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{merchantId ? 'Offres du commerce sélectionné' : 'Offres du moment'}</h1>
          <p>{currentCount} élément(s) disponible(s)</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: 14,
                color: 'var(--muted)'
              }}
            />
            <input
              className="input"
              style={{ paddingLeft: 40, width: 240 }}
              placeholder="Produit ou commerce..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="input"
            style={{ width: 160 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            className="input"
            style={{ width: 130 }}
            type="number"
            min="0"
            placeholder="Prix max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      {merchantId && (
        <div
          className="card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20
          }}
        >
          <span>Vous consultez les offres de ce commerce uniquement.</span>

          <button
            className="btn btn-ghost"
            onClick={() => setSearchParams({})}
          >
            Voir tous les commerces
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'offers' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('offers')
            setReserving(null)
            setMsg(null)
          }}
        >
          Offres classiques
        </button>

        <button
          className={`btn ${activeTab === 'baskets' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('baskets')
            setReserving(null)
            setMsg(null)
          }}
        >
          Paniers surprises
        </button>
      </div>

      {msg && (
        <div
          className={'badge ' + (msg.ok ? 'badge-green' : 'badge-red')}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      )}

      {activeTab === 'offers' ? renderOffers() : renderBaskets()}
    </>
  )
}


import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Package,
  ShoppingBag
} from 'lucide-react'

import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  getMySurpriseBaskets,
  createSurpriseBasket,
  updateSurpriseBasket,
  deleteSurpriseBasket
} from '../../services/api'

import { useAuth } from '../../context/AuthContext'

const CATEGORIES = [
  'boulangerie',
  'restaurant',
  'cafeteria',
  'epicerie',
  'patisserie',
  'autre'
]

const emptyOffer = {
  title: '',
  description: '',
  originalPrice: '',
  price: '',
  quantity: '',
  expirationDate: '',
  category: 'autre',
  imageUrl: '',
  pickupStart: '',
  pickupEnd: ''
}

const emptyBasket = {
  title: '',
  description: '',
  originalPrice: '',
  discountedPrice: '',
  quantity: '',
  category: 'autre',
  imageUrl: '',
  pickupStart: '',
  pickupEnd: ''
}

export default function MyOffers() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('offers')

  const [offers, setOffers] = useState([])
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ ...emptyOffer })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [baskets, setBaskets] = useState([])
  const [basketForm, setBasketForm] = useState({ ...emptyBasket })
  const [editingBasketId, setEditingBasketId] = useState(null)
  const [basketError, setBasketError] = useState('')
  const [basketLoadError, setBasketLoadError] = useState('')
  const [basketLoading, setBasketLoading] = useState(false)

  const load = async () => {
    if (!user?.uid) return

    try {
      setLoadError('')

      const response = await getOffers()

      const all = Array.isArray(response)
        ? response
        : Array.isArray(response?.offers)
          ? response.offers
          : []

      setOffers(all.filter(offer => offer.merchantId === user.uid))
    } catch (err) {
      setLoadError(
        err.response?.data?.error ||
        'Impossible de charger les offres.'
      )
    }
  }

  const loadBaskets = async () => {
    if (!user?.uid) return

    try {
      setBasketLoadError('')

      const response = await getMySurpriseBaskets()

      setBaskets(Array.isArray(response) ? response : [])
    } catch (err) {
      setBasketLoadError(
        err.response?.data?.error ||
        'Impossible de charger les paniers surprises.'
      )
    }
  }

  useEffect(() => {
    load()
    loadBaskets()
  }, [user])

  const handleChange = (field) => (e) => {
    setForm(previous => ({
      ...previous,
      [field]: e.target.value
    }))
  }

  const handleBasketChange = (field) => (e) => {
    setBasketForm(previous => ({
      ...previous,
      [field]: e.target.value
    }))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ ...emptyOffer })
    setError('')
  }

  const cancelBasketEdit = () => {
    setEditingBasketId(null)
    setBasketForm({ ...emptyBasket })
    setBasketError('')
  }

  const startEdit = (offer) => {
    setError('')
    setEditingId(offer.id)
    setActiveTab('offers')

    setForm({
      title: offer.title ?? '',
      description: offer.description ?? '',
      originalPrice: offer.originalPrice ?? '',
      price: offer.price ?? '',
      quantity: offer.quantity ?? '',
      expirationDate: offer.expirationDate ?? '',
      category: offer.category || 'autre',
      imageUrl: offer.imageUrl ?? '',
      pickupStart: offer.pickupStart ?? '',
      pickupEnd: offer.pickupEnd ?? ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startBasketEdit = (basket) => {
    setBasketError('')
    setEditingBasketId(basket.id)
    setActiveTab('baskets')

    setBasketForm({
      title: basket.title ?? '',
      description: basket.description ?? '',
      originalPrice: basket.originalPrice ?? '',
      discountedPrice: basket.discountedPrice ?? '',
      quantity: basket.quantity ?? '',
      category: basket.category || 'autre',
      imageUrl: basket.imageUrl ?? '',
      pickupStart: basket.pickupStart ?? '',
      pickupEnd: basket.pickupEnd ?? ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user?.uid) {
      setError('Utilisateur non connecté. Reconnectez-vous.')
      return
    }

    const title = form.title.trim()
    const originalPrice = Number(form.originalPrice)
    const price = Number(form.price)
    const quantity = Number(form.quantity)

    if (!title) {
      setError('Veuillez saisir le titre de l’offre.')
      return
    }

    if (
      form.originalPrice === '' ||
      form.price === '' ||
      form.quantity === ''
    ) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }

    if (
      !Number.isFinite(originalPrice) ||
      !Number.isFinite(price) ||
      !Number.isInteger(quantity) ||
      originalPrice <= 0 ||
      price < 0 ||
      quantity < 1
    ) {
      setError('Vérifiez les prix et la quantité.')
      return
    }

    if (price > originalPrice) {
      setError('Le prix réduit doit être inférieur au prix initial.')
      return
    }

    if (
      form.pickupStart &&
      form.pickupEnd &&
      form.pickupEnd <= form.pickupStart
    ) {
      setError("L'heure de fin doit être après l'heure de début.")
      return
    }

    const payload = {
      ...form,
      title,
      price,
      originalPrice,
      quantity
    }

    try {
      setLoading(true)

      if (editingId) {
        await updateOffer(editingId, payload)
      } else {
        await createOffer(payload)
      }

      cancelEdit()
      await load()
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        "Impossible d'enregistrer l'offre."
      )
    } finally {
      setLoading(false)
    }
  }

  const submitBasket = async (e) => {
    e.preventDefault()
    setBasketError('')

    if (!user?.uid) {
      setBasketError('Utilisateur non connecté. Reconnectez-vous.')
      return
    }

    const title = basketForm.title.trim()
    const originalPrice = Number(basketForm.originalPrice)
    const discountedPrice = Number(basketForm.discountedPrice)
    const quantity = Number(basketForm.quantity)

    if (!title) {
      setBasketError('Veuillez saisir le titre du panier.')
      return
    }

    if (
      basketForm.originalPrice === '' ||
      basketForm.discountedPrice === '' ||
      basketForm.quantity === ''
    ) {
      setBasketError('Veuillez remplir les champs obligatoires.')
      return
    }

    if (
      !Number.isFinite(originalPrice) ||
      !Number.isFinite(discountedPrice) ||
      !Number.isInteger(quantity) ||
      originalPrice <= 0 ||
      discountedPrice < 0 ||
      discountedPrice >= originalPrice ||
      quantity < 1
    ) {
      setBasketError('Vérifiez les prix et la quantité.')
      return
    }

    if (
      basketForm.pickupStart &&
      basketForm.pickupEnd &&
      basketForm.pickupEnd <= basketForm.pickupStart
    ) {
      setBasketError("L'heure de fin doit être après l'heure de début.")
      return
    }

    const payload = {
      ...basketForm,
      title,
      originalPrice,
      discountedPrice,
      quantity
    }

    try {
      setBasketLoading(true)

      if (editingBasketId) {
        await updateSurpriseBasket(editingBasketId, payload)
      } else {
        await createSurpriseBasket(payload)
      }

      cancelBasketEdit()
      await loadBaskets()
    } catch (err) {
      setBasketError(
        err.response?.data?.error ||
        err.message ||
        "Impossible d'enregistrer le panier surprise."
      )
    } finally {
      setBasketLoading(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Supprimer cette offre ?')) return

    try {
      await deleteOffer(id)

      setOffers(previous =>
        previous.filter(offer => offer.id !== id)
      )

      if (editingId === id) {
        cancelEdit()
      }
    } catch (err) {
      window.alert(
        err.response?.data?.error ||
        'Erreur lors de la suppression.'
      )
    }
  }

  const removeBasket = async (id) => {
    if (!window.confirm('Supprimer ce panier surprise ?')) return

    try {
      await deleteSurpriseBasket(id)

      setBaskets(previous =>
        previous.filter(basket => basket.id !== id)
      )

      if (editingBasketId === id) {
        cancelBasketEdit()
      }
    } catch (err) {
      window.alert(
        err.response?.data?.error ||
        'Erreur lors de la suppression du panier.'
      )
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Mes offres</h1>
          <p>Gérez vos offres et vos paniers surprises</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          className={`btn ${activeTab === 'offers' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('offers')}
        >
          <ShoppingBag size={17} />
          Offres classiques ({offers.length})
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'baskets' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('baskets')}
        >
          <Package size={17} />
          Paniers surprises ({baskets.length})
        </button>
      </div>

      {activeTab === 'offers' && (
        <>
          {loadError && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="badge badge-red">{loadError}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={load}
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="grid grid-2">
            <form className="card" onSubmit={submit}>
              <h3 style={{ marginBottom: 16 }}>
                {editingId ? "Modifier l'offre" : 'Nouvelle offre'}
              </h3>

              <div className="field">
                <label>Titre</label>
                <input
                  className="input"
                  type="text"
                  required
                  value={form.title}
                  onChange={handleChange('title')}
                />
              </div>

              <div className="field">
                <label>Description</label>
                <input
                  className="input"
                  type="text"
                  value={form.description}
                  onChange={handleChange('description')}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Prix initial (DT)</label>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.originalPrice}
                    onChange={handleChange('originalPrice')}
                  />
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>Prix réduit (DT)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={handleChange('price')}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Quantité</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={handleChange('quantity')}
                  />
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>Date limite</label>
                  <input
                    className="input"
                    type="date"
                    value={form.expirationDate}
                    onChange={handleChange('expirationDate')}
                  />
                </div>
              </div>

              <div className="field">
                <label>Catégorie</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={handleChange('category')}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Photo (lien URL)</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={handleChange('imageUrl')}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Récupération de</label>
                  <input
                    className="input"
                    type="time"
                    value={form.pickupStart}
                    onChange={handleChange('pickupStart')}
                  />
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>À</label>
                  <input
                    className="input"
                    type="time"
                    value={form.pickupEnd}
                    onChange={handleChange('pickupEnd')}
                  />
                </div>
              </div>

              {error && (
                <div className="badge badge-red" style={{ marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Enregistrement...' : editingId ? (
                    <>
                      <Save size={17} /> Enregistrer
                    </>
                  ) : (
                    <>
                      <Plus size={17} /> Publier
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={cancelEdit}
                  >
                    <X size={17} /> Annuler
                  </button>
                )}
              </div>
            </form>

            <div className="card table-wrap">
              <h3 style={{ marginBottom: 16 }}>Mes offres publiées</h3>

              <table>
                <thead>
                  <tr>
                    <th>Offre</th>
                    <th>Prix</th>
                    <th>Qté</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {offers.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: 30 }}>
                        Aucune offre publiée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    offers.map(offer => (
                      <tr key={offer.id}>
                        <td>
                          {offer.imageUrl && (
                            <img
                              src={offer.imageUrl}
                              alt={offer.title}
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: 'cover',
                                borderRadius: 6,
                                marginRight: 8,
                                verticalAlign: 'middle'
                              }}
                            />
                          )}

                          {offer.title}

                          <small style={{
                            display: 'block',
                            color: 'var(--muted)'
                          }}>
                            {offer.category || 'autre'}
                            {' · '}
                            {offer.pickupStart && offer.pickupEnd
                              ? `${offer.pickupStart}–${offer.pickupEnd}`
                              : 'horaire non défini'}
                            {' · '}
                            {offer.expirationDate || '—'}
                          </small>
                        </td>

                        <td>
                          <b>{offer.price} DT</b>{' '}
                          <s style={{ color: 'var(--muted)' }}>
                            {offer.originalPrice} DT
                          </s>
                        </td>

                        <td>{offer.quantity}</td>

                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => startEdit(offer)}
                              title="Modifier"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => remove(offer.id)}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'baskets' && (
        <>
          {basketLoadError && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="badge badge-red">{basketLoadError}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadBaskets}
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="grid grid-2">
            <form className="card" onSubmit={submitBasket}>
              <h3 style={{ marginBottom: 16 }}>
                {editingBasketId ? 'Modifier le panier surprise' : 'Nouveau panier surprise'}
              </h3>

              <div className="field">
                <label>Titre du panier</label>
                <input
                  className="input"
                  type="text"
                  required
                  value={basketForm.title}
                  onChange={handleBasketChange('title')}
                  placeholder="Ex : Panier surprise boulangerie"
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  className="input"
                  rows="3"
                  value={basketForm.description}
                  onChange={handleBasketChange('description')}
                  placeholder="Décrivez le contenu possible du panier..."
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Prix initial (DT)</label>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={basketForm.originalPrice}
                    onChange={handleBasketChange('originalPrice')}
                  />
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>Prix réduit (DT)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={basketForm.discountedPrice}
                    onChange={handleBasketChange('discountedPrice')}
                  />
                </div>
              </div>

              <div className="field">
                <label>Quantité disponible</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={basketForm.quantity}
                  onChange={handleBasketChange('quantity')}
                />
              </div>

              <div className="field">
                <label>Catégorie</label>
                <select
                  className="input"
                  value={basketForm.category}
                  onChange={handleBasketChange('category')}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Photo (lien URL)</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={basketForm.imageUrl}
                  onChange={handleBasketChange('imageUrl')}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Récupération de</label>
                  <input
                    className="input"
                    type="time"
                    value={basketForm.pickupStart}
                    onChange={handleBasketChange('pickupStart')}
                  />
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>À</label>
                  <input
                    className="input"
                    type="time"
                    value={basketForm.pickupEnd}
                    onChange={handleBasketChange('pickupEnd')}
                  />
                </div>
              </div>

              {basketError && (
                <div className="badge badge-red" style={{ marginBottom: 14 }}>
                  {basketError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={basketLoading}
                >
                  {basketLoading ? 'Enregistrement...' : editingBasketId ? (
                    <>
                      <Save size={17} /> Enregistrer
                    </>
                  ) : (
                    <>
                      <Plus size={17} /> Publier le panier
                    </>
                  )}
                </button>

                {editingBasketId && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={cancelBasketEdit}
                  >
                    <X size={17} /> Annuler
                  </button>
                )}
              </div>
            </form>

            <div className="card table-wrap">
              <h3 style={{ marginBottom: 16 }}>Mes paniers surprises</h3>

              <table>
                <thead>
                  <tr>
                    <th>Panier</th>
                    <th>Prix</th>
                    <th>Restants</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {baskets.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: 30 }}>
                        Aucun panier surprise publié pour le moment.
                      </td>
                    </tr>
                  ) : (
                    baskets.map(basket => (
                      <tr key={basket.id}>
                        <td>
                          {basket.imageUrl && (
                            <img
                              src={basket.imageUrl}
                              alt={basket.title}
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: 'cover',
                                borderRadius: 6,
                                marginRight: 8,
                                verticalAlign: 'middle'
                              }}
                            />
                          )}

                          {basket.title}

                          <small style={{
                            display: 'block',
                            color: 'var(--muted)'
                          }}>
                            {basket.category || 'autre'}
                            {' · '}
                            {basket.pickupStart && basket.pickupEnd
                              ? `${basket.pickupStart}–${basket.pickupEnd}`
                              : 'horaire non défini'}
                          </small>
                        </td>

                        <td>
                          <b>{basket.discountedPrice} DT</b>{' '}
                          <s style={{ color: 'var(--muted)' }}>
                            {basket.originalPrice} DT
                          </s>
                        </td>

                        <td>
                          {basket.remainingQuantity ?? basket.quantity}
                          {' / '}
                          {basket.quantity}
                        </td>

                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => startBasketEdit(basket)}
                              title="Modifier"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeBasket(basket.id)}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}


import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet'
import {
  MapPin,
  Navigation,
  Search,
  Store,
  MapPinned,
  LocateFixed,
  ShoppingBag,
  ArrowUpRight
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRadarMerchants } from '../../services/api'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapController({ position, selectedMerchant }) {
  const map = useMap()

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(timer)
  }, [map])

  useEffect(() => {
    if (position) map.flyTo(position, 15)
  }, [position, map])

  useEffect(() => {
    if (selectedMerchant) {
      map.flyTo(
        [selectedMerchant.latitude, selectedMerchant.longitude],
        16
      )
    }
  }, [selectedMerchant, map])

  return null
}

export default function CampusRadar() {
  const navigate = useNavigate()

  const [merchants, setMerchants] = useState([])
  const [position, setPosition] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedMerchant, setSelectedMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMerchants = async () => {
      try {
        const data = await getRadarMerchants()

        const validMerchants = (data.merchants || []).filter(
          (merchant) =>
            merchant.latitude != null &&
            merchant.longitude != null &&
            Number.isFinite(Number(merchant.latitude)) &&
            Number.isFinite(Number(merchant.longitude))
        )

        setMerchants(validMerchants)
      } catch (err) {
        setError(
          err.response?.data?.error ||
          'Impossible de charger les commerces.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadMerchants()
  }, [])

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible.')
      return
    }

    setLocating(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude])
        setLocating(false)
      },
      (err) => {
        if (err.code === 1) {
          setError('Vous avez refusé l’accès à votre position.')
        } else if (err.code === 2) {
          setError('Votre position est indisponible.')
        } else {
          setError('La demande de localisation a expiré.')
        }

        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const filteredMerchants = merchants.filter((merchant) =>
    `${merchant.businessName || ''} ${merchant.category || ''} ${merchant.address || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const showOffers = (merchant) => {
    navigate(`/student?merchant=${encodeURIComponent(merchant.uid)}`)
  }

  return (
    <div className="radar-page space-y-6 pb-8">

      <style>{`
        .radar-page {
          color: #172b22;
        }

        .radar-hero {
          background: linear-gradient(120deg, #ffffff 0%, #f0fdf4 100%);
          border: 1px solid #dcfce7;
          border-radius: 22px;
          padding: 28px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
        }

        .radar-primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 12px 20px;
          border: 1px solid #15803d;
          border-radius: 12px;
          background: #15803d;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
          box-shadow: 0 4px 10px rgba(21, 128, 61, .16);
        }

        .radar-primary-btn:hover {
          background: #166534;
          border-color: #166534;
          transform: translateY(-2px);
          box-shadow: 0 7px 15px rgba(21, 128, 61, .2);
        }

        .radar-primary-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
          transform: none;
        }

        .radar-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 15px;
          border: 1px solid #bbf7d0;
          border-radius: 11px;
          background: #f0fdf4;
          color: #166534;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
        }

        .radar-secondary-btn:hover {
          background: #dcfce7;
          border-color: #86efac;
          transform: translateY(-2px);
        }

        .radar-offers-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 16px;
          border: 1px solid #15803d;
          border-radius: 11px;
          background: #15803d;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
          box-shadow: 0 3px 8px rgba(21, 128, 61, .15);
        }

        .radar-offers-btn:hover {
          background: #166534;
          border-color: #166534;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(21, 128, 61, .2);
        }

        .radar-merchant-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 17px;
          background: white;
          box-shadow: 0 3px 12px rgba(15, 23, 42, .035);
          transition: all .22s ease;
        }

        .radar-merchant-card:hover {
          border-color: #86efac;
          box-shadow: 0 9px 22px rgba(21, 128, 61, .09);
          transform: translateY(-3px);
        }

        .radar-merchant-card.selected {
          border: 2px solid #22c55e;
          background: #f7fef8;
        }

        .radar-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 14px;
          background: #dcfce7;
          color: #15803d;
        }

        .radar-category {
          display: inline-block;
          margin-top: 7px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .radar-search {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 11px 14px 11px 40px;
          outline: none;
          font-size: 14px;
          transition: all .2s ease;
          background: #fff;
        }

        .radar-search:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, .12);
        }

        @media (min-width: 640px) {
          .radar-merchant-card {
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>

      {/* En-tête */}
      <div className="radar-hero">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-green-700">
              <MapPinned size={22} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Découverte locale
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Campus Radar
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
              Découvrez les commerces partenaires autour de vous
              et profitez de leurs offres à prix réduits.
            </p>
          </div>

          <button
            onClick={locateMe}
            disabled={locating}
            className="radar-primary-btn"
          >
            <LocateFixed size={19} />
            {locating ? 'Localisation...' : 'Me localiser'}
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="radar-icon-box">
            <Store size={23} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '...' : merchants.length}
            </p>
            <p className="text-sm text-gray-500">
              Commerces partenaires
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MapPin size={23} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">
              {position ? 'Position activée' : 'Non activée'}
            </p>
            <p className="text-sm text-gray-500">
              Votre localisation
            </p>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Carte */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned className="text-green-600" size={21} />
              <h2 className="text-lg font-bold text-gray-900">
                Carte des commerces
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Cliquez sur un marqueur pour découvrir le commerce.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un commerce..."
              className="radar-search"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-[450px] items-center justify-center text-gray-500">
            Chargement de la carte...
          </div>
        ) : (
          <div className="w-full" style={{ height: '500px' }}>
            <MapContainer
              center={[36.8065, 10.1815]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                position={position}
                selectedMerchant={selectedMerchant}
              />

              {position && (
                <Marker position={position}>
                  <Popup>
                    <strong>Votre position actuelle</strong>
                  </Popup>
                </Marker>
              )}

              {filteredMerchants.map((merchant) => (
                <Marker
                  key={merchant.uid}
                  position={[
                    Number(merchant.latitude),
                    Number(merchant.longitude)
                  ]}
                  eventHandlers={{
                    click: () => setSelectedMerchant(merchant)
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 190 }}>
                      <strong>{merchant.businessName}</strong>
                      <p style={{ margin: '6px 0' }}>
                        {merchant.category || 'Commerce'}
                      </p>
                      <p style={{ margin: '6px 0' }}>
                        {merchant.address}
                      </p>
                      <button
                        onClick={() => showOffers(merchant)}
                        className="radar-offers-btn"
                        style={{ width: '100%', marginTop: 10 }}
                      >
                        <ShoppingBag size={15} />
                        Voir les offres
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-500">
          <span>
            {filteredMerchants.length} commerce(s) correspondant à votre recherche
          </span>
          <span className="hidden items-center gap-1 text-green-700 sm:flex">
            <MapPin size={14} />
            OpenStreetMap
          </span>
        </div>
      </div>

      {/* Liste des commerces */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Store size={22} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Commerces partenaires
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Sélectionnez un commerce pour le retrouver sur la carte.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement des commerces...</p>
        ) : filteredMerchants.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
            <Store size={35} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">
              Aucun commerce trouvé
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Essayez un autre nom ou une autre catégorie.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredMerchants.map((merchant) => (
              <div
                key={merchant.uid}
                className={`radar-merchant-card ${
                  selectedMerchant?.uid === merchant.uid ? 'selected' : ''
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="radar-icon-box">
                    <Store size={22} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold text-gray-900">
                      {merchant.businessName}
                    </h3>

                    <span className="radar-category">
                      {merchant.category || 'Commerce'}
                    </span>

                    {merchant.address && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
                        <MapPin
                          size={14}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />
                        <span>{merchant.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setSelectedMerchant(merchant)}
                    className="radar-secondary-btn"
                  >
                    <Navigation size={15} />
                    Carte
                  </button>

                  <button
                    onClick={() => showOffers(merchant)}
                    className="radar-offers-btn"
                  >
                    <ShoppingBag size={15} />
                    Offres
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

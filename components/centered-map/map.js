import React from 'react'
import PropTypes from 'prop-types'
import mapboxgl from 'mapbox-gl'
import mapStyle from 'mapbox-gl/dist/mapbox-gl.css'

import enhanceMapData from './enhance-map-data'

import Feature from './feature'

const UNIQUE_FEATURE_ID = '$GDV_UNIQUE_FEATURE_ID$'

class CenteredMap extends React.Component {
  static propTypes = {
    data: PropTypes.object.isRequired,
    bbox: PropTypes.array.isRequired,
    frozen: PropTypes.bool.isRequired
  }

  state = {
    highlight: null
  }

  constructor(props) {
    super(props)

    this.handlers = []

    if (!props.frozen) {
      for (const layer of ['point', 'polygon-fill', 'line']) {
        this.handlers.push({
          event: 'mousemove',
          layer,
          handler: this.onMouseMove.bind(this, layer)
        }, {
          event: 'mouseleave',
          layer,
          handler: this.onMouseLeave.bind(this, layer)
        })
      }
    }
  }

  componentDidMount() {
    const {frozen, bbox} = this.props

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json',
      interactive: !frozen
    })

    this.map.once('load', this.onLoad)

    this.map.fitBounds(bbox, {
      padding: 30,
      linear: true,
      duration: 0
    })

    for (const {event, layer, handler} of this.handlers) {
      this.map.on(event, layer, handler)
    }
  }

  componentWillUnmount() {
    const {map} = this

    for (const {event, layer, handler} of this.handlers) {
      map.off(event, layer, handler)
    }
  }

  onLoad = () => {
    const {map} = this
    const {data} = this.props

    map.addSource('data', {
      type: 'geojson',
      data
    })

    map.addSource('hover', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    })

    map.addLayer({
      id: 'point',
      type: 'circle',
      source: 'data',
      paint: {
        'circle-radius': 5,
        'circle-color': '#3099df',
        'circle-opacity': 0.6
      },
      filter: ['==', '$type', 'Point']
    })

    map.addLayer({
      id: 'point-hover',
      type: 'circle',
      source: 'hover',
      paint: {
        'circle-radius': 5,
        'circle-color': '#2c3e50',
        'circle-opacity': 0.8
      },
      filter: ['==', '$type', 'Point']
    })

    map.addLayer({
      id: 'polygon-fill',
      type: 'fill',
      source: 'data',
      paint: {
        'fill-color': '#3099df',
        'fill-opacity': 0.3
      },
      filter: ['==', '$type', 'Polygon']
    })

    map.addLayer({
      id: 'polygon-fill-hover',
      type: 'fill',
      source: 'hover',
      paint: {
        'fill-color': '#9ab0d1'
        // We’re not setting an opacity here.
        // There will be overlapping features due to how vector tiles work.
      },
      filter: ['==', '$type', 'Polygon']
    })

    map.addLayer({
      id: 'polygon-outline',
      type: 'line',
      source: 'data',
      paint: {
        'line-color': '#4790E5',
        'line-width': 2
      },
      filter: ['==', '$type', 'Polygon']
    })

    map.addLayer({
      id: 'line',
      type: 'line',
      source: 'data',
      paint: {
        'line-color': '#3099df',
        'line-width': 5,
        'line-opacity': 0.8
      },
      filter: ['==', '$type', 'LineString']
    })

    map.addLayer({
      id: 'line-hover',
      type: 'line',
      source: 'hover',
      paint: {
        'line-color': '#2c3e50',
        'line-width': 5,
        'line-opacity': 0.8
      },
      filter: ['==', '$type', 'LineString']
    })
  }

  onMouseMove = (layer, event) => {
    const {map} = this
    const canvas = map.getCanvas()
    canvas.style.cursor = 'pointer'

    const [feature] = event.features

    const sourceFeatures = map.querySourceFeatures('data', {
      filter: [
        '==', UNIQUE_FEATURE_ID, feature.properties[UNIQUE_FEATURE_ID]
      ]
    })

    // Eventually, we’ll have to @turf/union the sourceFeatures
    // when https://github.com/w8r/martinez/issues/51 is fixed.

    map.getSource('hover').setData({
      type: 'FeatureCollection',
      features: sourceFeatures
    })

    const properties = {...feature.properties}
    delete properties[UNIQUE_FEATURE_ID]

    this.setState({
      highlight: {
        properties,
        count: event.features.length
      }
    })
  }

  onMouseLeave = () => {
    const {map} = this
    const canvas = map.getCanvas()
    canvas.style.cursor = ''

    map.getSource('hover').setData({
      type: 'FeatureCollection',
      features: []
    })

    this.setState({
      highlight: null
    })
  }

  render() {
    const {highlight} = this.state

    return (
      <div className='container'>
        <div ref={el => {
          this.mapContainer = el
        }} className='container' />

        {highlight && (
          <div className='info'>
            <Feature properties={highlight.properties} otherFeaturesCount={highlight.count - 1} />
          </div>
        )}

        <style
          dangerouslySetInnerHTML={{__html: mapStyle}} // eslint-disable-line react/no-danger
        />
        <style jsx>{`
          .container {
            position: relative;
            height: 100%;
            width: 100%;
          }

          .info {
            position: absolute;
            pointer-events: none;
            top: 10px;
            left: 10px;
            max-width: 40%;
            overflow: hidden;
          }
        `}</style>
      </div>
    )
  }
}

export default enhanceMapData(UNIQUE_FEATURE_ID)(
  CenteredMap
)

import React, { Component } from 'react';
import { Map, Marker, Popup, TileLayer, withLeaflet } from 'react-leaflet';
import '../../../node_modules/@ansur/leaflet-pulse-icon/dist/L.Icon.Pulse';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { ReactLeafletSearch } from 'react-leaflet-search';
import L from 'leaflet';
import { connect } from 'react-redux';
import { fetchCities } from '../../thunks/fetchCities';
import { fetchStations } from '../../thunks/fetchStations';
import { postFavorite } from '../../thunks/postFavorite';
import { deleteFavorite } from '../../thunks/deleteFavorite';
import PropTypes from 'prop-types';
import getDistance from 'geodist';

const MapSearch = withLeaflet(ReactLeafletSearch);
const MarkerCluster = withLeaflet(MarkerClusterGroup);

export class BikeMap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lat: 0,
      lon: 0,
      loading: true,
      closestNetwork: '',
    }
  }

  getLocation = () => {
    this.setState({ lat: 0, lon: 0, loading: true });
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      this.setState({
        lat: latitude,
        lon: longitude,
        loading: false,
      });
      this.getNetwork(latitude, longitude);
    });
  }

  showCurrentLocation = () => {
    const { lat, lon } = this.state;
    const pulsingIcon = new L.icon.pulse({ 
      iconSize: [12, 12], 
      color: '#59A579', 
      fillColor: '#59A579',
      heartbeat: 2
    });

    return (
      <Marker
        icon={pulsingIcon}
        position={[lat, lon]}
        key={'geoloc'}
        id={'geoloc'}>
      </Marker>
    )
  }

  toggleFavorite = (e) => {
    const { id } = e.target;
    const { deleteFavorite, postFavorite, user, favorites } = this.props;
    if (user.name) {
      favorites.includes(id) ? 
        deleteFavorite(id, user.id) :
        postFavorite(id, user.id);
    }
  }

  setMarkerColor = (free, empty) => {
    const percent = free / (free + empty);
    if (percent <= 0.25) {
      return 'bike-light'
    } else if (percent > 0.75) {
      return 'bike-dark'
    } else {
      return 'bike-mid'
    }
  }

  createStationMarkers = (data, icon) => {
    return data.map(marker => {
      const { name, latitude, longitude, free_bikes, empty_slots, timestamp, id } = marker;
      const { favorites, user } = this.props;

      let newIcon;
      let buttonText;
      const bikeIcon = this.setMarkerColor(free_bikes, empty_slots);

      if (favorites.includes(id)) {
        newIcon = new L.icon({ ...icon, iconUrl: require(`../../images/${bikeIcon}-purple.png`) }); 
        buttonText = 'Click to remove from stops';
      } else {
        newIcon = new L.icon({ ...icon, iconUrl: require(`../../images/${bikeIcon}-blue.png`) });
        buttonText = 'Click to add to stops';
      }
      
      const distance = getDistance({ lat: this.state.lat, lon: this.state.lon }, { lat: latitude, lon: longitude }, { exact: true, unit: 'mi' });
      const temp = new Date(timestamp);
      const date = temp.toDateString();
      const time = temp.toTimeString().substring(0,5);
      return (
        <Marker
          className='marker'
          position={[latitude, longitude]}
          icon={newIcon}
          key={id}
          >
          <Popup 
            className='tooltip' 
            closeButton={false}
          >{
            <div>
              <h4>{name}</h4>
              <h4 className='network-name-text'>{this.state.networkName}</h4>
              <p>Distance away: {distance.toFixed(1)} mi</p>
              <p>Empty slots: {empty_slots}</p>
              <p>Free bikes: {free_bikes}</p>
              <p>Updated: {date}, {time}</p>
              {user.name && 
                <p 
                id={id}
                onClick={this.toggleFavorite}
                className='click-text'
                >
                  {buttonText}
                </p>
              }
            </div>
            }
          </Popup>
        </Marker>
      )
    });
  }

  showMarkers = () => {
    const { pathname } = this.props.location;
    const { stations, favorites } = this.props;
    let icon = {
      iconSize: [25, 25],
      iconAnchor: [12, 41],
      popupAnchor: [0, -35],
    };
    const data = pathname === '/my-stops' ? stations.filter(station => favorites.includes(station.id)) : stations;
    return this.createStationMarkers(data, icon)
  }
  
  getNetwork = (lat, lon) => {
    const { cities, fetchStations } = this.props;
    let shortestDistance = 100000;
    let closestNetwork;
    let networkName;
    cities.forEach(city => {
      const { latitude, longitude } = city.location;
      const distance = getDistance({ lat, lon }, { lat: latitude, lon: longitude }, { exact: true, unit: 'mi' });
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestNetwork = city.id;
        networkName = city.name;
      }
    });
    if (closestNetwork !== this.state.closestNetwork) {
      this.setState({ closestNetwork, networkName });
      fetchStations(null, closestNetwork);
    }
  }

  updateMapCenter = (e) => {
    const leafletMap = e.target;
    const center = leafletMap.getCenter();
    this.getNetwork(center.lat, center.lng);
  }

  async componentDidMount() {
    await this.props.fetchCities();
    this.getLocation();
    setTimeout(() => {
      this.setState({ loading: false });
    }, 100);
  }

  render() {
    const { lat, lon, loading } = this.state;
    return (
      <div className='map-container'>
        {!loading && <i onClick={this.getLocation} className="fas fa-location-arrow"></i>}
        {!loading &&
          <Map
            onMove={this.updateMapCenter}
            id='map'
            minZoom='11'
            maxZoom='19'
            center={[lat, lon]}
            zoom='13'>
            {this.showCurrentLocation()}
            <MarkerCluster
              showCoverageOnHover={false}
              maxClusterRadius={40}
            >
              {this.showMarkers()}
            </MarkerCluster>
            <MapSearch 
              position='topright'
              inputPlaceholder="Search by location"
              showMarker={false}
              showPopup={true}
              openSearchOnLoad={true}
              zoom={13}
            />
            <TileLayer
              url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | <a href="http://api.citybik.es/v2/">CityBikes API</a>'
              subdomains='abcd'
              minZoom='3'
              maxZoom='19'
              ext='png'
            />
          </Map>
        }
      </div>  
    )
  }
}

export const mapStateToProps = (state) => ({
  cities: state.cities,
  stations: state.stations,
  favorites: state.favorites,
  user: state.user,
  loading: state.loading
});

export const mapDispatchToProps = (dispatch) => ({
  fetchCities: () => dispatch(fetchCities()),
  fetchStations: (user_id, city) => dispatch(fetchStations(user_id, city)),
  deleteFavorite: (station, user) => dispatch(deleteFavorite(station, user)),
  postFavorite: (station, user) => dispatch(postFavorite(station, user)),
});

BikeMap.propTypes = {
  cities: PropTypes.array,
  stations: PropTypes.array,
  favorites: PropTypes.array,
  user: PropTypes.object,
  fetchStations: PropTypes.func,
  deleteFavorite: PropTypes.func,
  postFavorite: PropTypes.func,
}

BikeMap.defaultProps = {
  cities: [],
  stations: [],
  favorites: [],
  user: {},
}

export default connect(mapStateToProps, mapDispatchToProps)(BikeMap);
import React, { useEffect, useRef, useState } from 'react';
import axios from "axios";
import { navigate } from "raviger";
import { Formik } from 'formik';
import { ButtonGroup, Card, Col, Form as BootstrapForm } from 'react-bootstrap';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowAltCircleLeft,
} from '@fortawesome/free-solid-svg-icons';
import * as Yup from 'yup';
import L from "leaflet";
import { Map, Marker, Tooltip as MapTooltip, TileLayer } from "react-leaflet";
import { Legend, pinMarkerIcon } from "./components/Map";
import { TextInput } from './components/Form.js';
import ButtonSpinner from './components/ButtonSpinner.js';

const IncidentForm = ({ id }) => {

  const [data, setData] = useState({
    name: '',
    slug: '',
    latitude: '',
    longitude: '',
  });

  const [bounds, setBounds] = useState(L.latLngBounds([[0,0]]));

  const markerRef = useRef(null);
  const mapRef = useRef(null);

  const updatePosition = (setFieldValue) => {
    const marker = markerRef.current;
    const map = mapRef.current
    if (marker !== null) {
      const latLon = marker.leafletElement.getLatLng();
      setFieldValue("latlon", latLon.lat.toFixed(4) + ', ' + latLon.lng.toFixed(4))
      setFieldValue("latitude", +(Math.round(latLon.lat + "e+4") + "e-4"));
      setFieldValue("longitude", +(Math.round(latLon.lng + "e+4") + "e-4"));
      map.leafletElement.setView(latLon);
    }
  }

  const addMarker = (e, setFieldValue) => {
    if (!id) {
      setFieldValue("latlon", e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4))
      setFieldValue("latitude", +(Math.round(e.latlng.lat + "e+4") + "e-4"));
      setFieldValue("longitude", +(Math.round(e.latlng.lng + "e+4") + "e-4"));
    }
  }

  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();
    if (id) {
      const fetchIncident = async () => {
        // Fetch Visit Note data.
        await axios.get('/incident/api/incident/' + id + '/', {
          cancelToken: source.token,
        })
        .then(response => {
          if (!unmounted) {
            response.data['latlon'] = response.data['latitude'] + ', ' + response.data['longitude']
            setData(response.data);
          }
        })
        .catch(error => {
        });
      };
      fetchIncident();
    }
    else {
      const fetchIncidents = async () => {
        // Fetch Visit Note data.
        await axios.get('/incident/api/incident/', {
          cancelToken: source.token,
        })
        .then(response => {
          if (!unmounted) {
            const incident_bounds = [];
            for (const incident of response.data) {
              if (incident.latitude && incident.longitude && !incident.end_time) {
                incident_bounds.push([incident.latitude, incident.longitude]);
              }
            }
            // Add in some extra bounds to prevent map zoom level from being too small with few or nearby incident locations.
            if (incident_bounds.length >= 1) {
              incident_bounds.push([parseFloat(incident_bounds[0][0])+.04,incident_bounds[0][1]-.04])
              incident_bounds.push([parseFloat(incident_bounds[0][0])-.04,parseFloat(incident_bounds[0][1])+.04])
            }
            setBounds(incident_bounds);
          }
        })
        .catch(error => {
        });
      };
      fetchIncidents();
    }
    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, [id]);

  return (
    <Formik
      initialValues={data}
      enableReinitialize={true}
      validationSchema={Yup.object({
        name: Yup.string()
          .max(20, 'Must be 20 characters or less')
          .required('Required'),
        latlon: Yup.string().required('Required'),
        latitude: Yup.number(),
        longitude: Yup.number()
      })}
      onSubmit={(values, { setSubmitting }) => {
        values['slug'] = values.name.replaceAll(' ','-').match(/[a-zA-Z0-9-]+/g)[0];
        if (id) {
          axios.put('/incident/api/incident/' + id + '/', values)
          .then(function () {
            navigate('/');
          })
          .catch(error => {
          });
        }
        else {
          axios.post('/incident/api/incident/', values)
          .then(function () {
            navigate('/');
          })
          .catch(error => {
          });
        }
      }}
    >
      {form => (
        <Card border="secondary" className="mt-4 ml-auto mr-auto" style={{width:"50%", maxWidth:"50%"}}>
          <Card.Header as="h5" className="pl-3"><span style={{ cursor: 'pointer' }} onClick={() => navigate("/")} className="mr-3"><FontAwesomeIcon icon={faArrowAltCircleLeft} size="lg" inverse /></span>{id ? 'Edit' : 'New'} Incident</Card.Header>
          <Card.Body>
            <BootstrapForm>
              <BootstrapForm.Row>
                <TextInput
                  type="text"
                  label="Name*"
                  name="name"
                  id="name"
                  xs="12"
                  disabled={form.values.name === 'Test' ? true : false}
                />
              </BootstrapForm.Row>
              <BootstrapForm.Row>
                <TextInput
                  type="text"
                  label="Lat/Lon*"
                  name="latlon"
                  id="latlon"
                  xs="12"
                  onChange={(e) => {
                    const lookup = e.target.value.replace(' ', '').split(',');
                    if (lookup[0] <= 90 && lookup[0] >= -90 && lookup[1] <= 180 && lookup[1] >= -180) {
                      form.setFieldValue("latitude", Number(lookup[0]));
                      form.setFieldValue("longitude", Number(lookup[1]));
                    }
                    form.setFieldValue("latlon", e.target.value);
                  }}
                  value={form.values.latlon || ''}
                />
              </BootstrapForm.Row>
              <BootstrapForm.Row>
              <Col xs="12">
                <BootstrapForm.Label>Refine Incident Lat/Lon Point</BootstrapForm.Label>
                <Map zoom={11} ref={mapRef} bounds={bounds} center={id ? [form.values.latitude || 0, form.values.longitude || 0] : [0,0]} onClick={(e) => {addMarker(e, form.setFieldValue)}} className="incident-leaflet-container border rounded">
                  <Legend position="bottomleft" metric={false} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {form.values.latitude && form.values.longitude ?
                  <Marker
                    draggable={true}
                    onDragEnd={() => {
                      updatePosition(form.setFieldValue)
                    }}
                    position={[form.values.latitude, form.values.longitude]}
                    icon={pinMarkerIcon}
                    ref={markerRef}
                  >
                    <MapTooltip direction="top">
                      <div>
                        Lat: {form.values.latitude}, Lon: {form.values.longitude}
                      </div>
                    </MapTooltip>
                  </Marker>
                  : ""}
                </Map>
              </Col>
              </BootstrapForm.Row>
            </BootstrapForm>
          </Card.Body>
          <ButtonGroup size="lg">
            <ButtonSpinner isSubmitting={form.isSubmitting} isSubmittingText="Saving..." className="btn btn-primary border" onClick={() => { form.submitForm() }}>Save</ButtonSpinner>
          </ButtonGroup>
        </Card>
      )}
    </Formik>
  );
};

export default IncidentForm;

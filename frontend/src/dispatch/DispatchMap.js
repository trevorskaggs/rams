import React, { useEffect, useState } from 'react';
import axios from "axios";
import { Link, navigate } from 'raviger';
import { Form, Formik } from 'formik';
import { Button, Col, FormCheck, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBandAid, faBullseye, faCar, faCircle, faClipboardList, faExclamationCircle, faQuestionCircle, faTrailer
} from '@fortawesome/free-solid-svg-icons';
import { faBadgeSheriff, faHomeAlt } from '@fortawesome/pro-solid-svg-icons';
import { Circle, CircleMarker, Map, TileLayer, Tooltip as MapTooltip, useLeaflet } from "react-leaflet";
import L from "leaflet";
import badge from "../static/images/badge-sheriff.png";
import bandaid from "../static/images/band-aid-solid.png";
import car from "../static/images/car-solid.png";
import trailer from "../static/images/trailer-solid.png";
import reported from "../static/images/exclamation-circle.png";
import sip from "../static/images/house-circle.png";
import utl from "../static/images/question-circle.png";
import { Typeahead } from 'react-bootstrap-typeahead';
import Moment from 'react-moment';
import { Legend } from "../components/Map";
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'leaflet/dist/leaflet.css';

function Deploy() {

  const [data, setData] = useState({service_requests: [], isFetching: false, bounds:L.latLngBounds([[0,0]])});
  const [mapState, setMapState] = useState({});
  const [totalSelectedState, setTotalSelectedState] = useState({'REPORTED':{}, 'SHELTERED IN PLACE':{}, 'UNABLE TO LOCATE':{}});
  const [selectedCount, setSelectedCount] = useState({count:0, disabled:true});
  const [statusOptions, setStatusOptions] = useState({aco_required:false, pending_only: true});
  const [teamData, setTeamData] = useState({options: [], isFetching: false});

  // Handle aco_required toggle.
  const handleACO = async event => {
    setStatusOptions({aco_required:!statusOptions.aco_required, pending_only:statusOptions.pending_only})
  }

  // Handle pending_only toggle.
  const handlePendingOnly = async event => {
    setStatusOptions({aco_required:statusOptions.aco_required, pending_only:!statusOptions.pending_only})
  }

  // Handle radius circle toggles.
  const handleRadius = (id) => {
    if (mapState[id].radius === "disabled") {
      setMapState(prevState => ({ ...prevState, [id]: {...prevState[id], ["radius"]:"enabled"} }));
    }
    else {
      setMapState(prevState => ({ ...prevState, [id]: {...prevState[id], ["radius"]:"disabled"} }));
    }
  }

  // Handle dynamic SR state and map display when an SR is selected or deselected.
  const handleMapState = (id) => {
    // If selected.
    if (mapState[id].checked === false) {
      setMapState(prevState => ({ ...prevState, [id]: {...prevState[id], ["color"]:"green", ["checked"]:true} }));

      // Add each match count to the running total state tracker.
      var status_matches = {};
      for (var status in mapState[id].status_matches) {
        var matches = totalSelectedState[status];
        for (var key in mapState[id].status_matches[status]){
          var total = 0;
          if (!totalSelectedState[status][key]) {
            total = mapState[id].status_matches[status][key];
          } else {
            total = totalSelectedState[status][key] += mapState[id].status_matches[status][key];
          }
          matches[key] = total;
        }
        status_matches[status] = matches;
      }
      setTotalSelectedState(Object.assign(totalSelectedState, status_matches));
      // Enable DEPLOY button.
      setSelectedCount((prevState) => ({count: prevState.count + 1, disabled: false}));
    }
    // Else deselect.
    else {
      let color = 'yellow';
      if (mapState[id].has_reported_animals) {
        color = 'red';
      }
      setMapState(prevState => ({ ...prevState, [id]: {...prevState[id], ["color"]:color, ["checked"]:false} }));
      // Remove matches from the running total state tracker.
      for (var st in mapState[id].status_matches) {
        var total = 0;
        for (var key in mapState[id].status_matches[st]) {
          var total = totalSelectedState[st][key] -= mapState[id].status_matches[st][key];
          setTotalSelectedState(prevState => ({ ...prevState, [st]:{...prevState[st], [key]:total}}));
        }
      }
      // Disable DEPLOY button is none selected.
      var disabled = false;
      if (selectedCount.count-1 === 0) {
        disabled = true;
      }
      setSelectedCount((prevState) => ({count: prevState.count - 1, disabled: disabled}))
    }
  }

  // Takes in animal size, species, and count and returns a pretty string combination.
  const prettyText = (size, species, count) => {
    if (count <= 0) {
      return "";
    }
    var plural = ""
    if (count > 1) {
      plural = "s"
    }

    var size_and_species = size + " " + species + plural;
    // Exception for horses since they don't need an extra species output.
    if (species === 'horse') {
      // Exception for pluralizing ponies.
      if (size === 'pony' && count > 1) {
        size_and_species = 'ponies'
      }
      if (size === 'unknown') {
        size_and_species = 'horse' + plural
      }
      else {
        size_and_species = size + plural;
      }
    }

    var text = count + " " + size_and_species;
    return text;
  }

  // Counts the number of size/species matches for a service request by status.
  const countMatches = (service_request) => {
    var matches = {};
    var status_matches = {'REPORTED':{}, 'SHELTERED IN PLACE':{}, 'UNABLE TO LOCATE':{}};

    service_request.animals.forEach((animal) => {
      if (['REPORTED', 'SHELTERED IN PLACE', 'UNABLE TO LOCATE'].indexOf(animal.status) > -1) {
        if (!matches[[animal.species,animal.size]]) {
          matches[[animal.species,animal.size]] = 1;
        }
        else {
          matches[[animal.species,animal.size]] += 1;
        }
        if (!status_matches[animal.status][[animal.species,animal.size]]) {
          status_matches[animal.status][[animal.species,animal.size]] = 1;
        }
        else {
          status_matches[animal.status][[animal.species,animal.size]] += 1;
        }
      }
    });
    return [matches, status_matches]
  }

  // Show or hide list of SRs based on current map zoom
  const onMove = event => {
    let tempMapState = mapState;
    for (const service_request of data.service_requests) {
      if (mapState[service_request.id]) {
        if (!event.target.getBounds().contains(L.latLng(service_request.latitude, service_request.longitude))) {
          tempMapState[service_request.id].hidden=true;
        }
        else {
          tempMapState[service_request.id].hidden=false;
        }
      }
    }
    setMapState(prevState => ({ ...prevState, tempMapState}));
  }

  // Hook for initializing data.
  useEffect(() => {
    let source = axios.CancelToken.source();
    const fetchTeamMembers = async () => {
      setTeamData({options: [], isFetching: true});
      await axios.get('/evac/api/evacteammember/', {
        cancelToken: source.token,
      })
      .then(response => {
        var options = []
        response.data.forEach(function(teammember){
          options.push({id: teammember.id, label: teammember.display_name})
        });
        setTeamData({options: options, isFetching: false});
      })
      .catch(error => {
        console.log(error.response);
        setTeamData({options: [], isFetching: false});
      });
    };

    const fetchServiceRequests = async () => {
      // Fetch ServiceRequest data.
      await axios.get('/hotline/api/servicerequests/', {
        params: {
          status: 'open',
          aco_required: statusOptions.aco_required,
          pending_only: statusOptions.pending_only,
          map: true
        },
        cancelToken: source.token,
      })
      .then(response => {
        setData({service_requests: response.data, isFetching: false, bounds:data.bounds});
        const map_dict = mapState;
        const bounds = [];
        const current_ids = Object.keys(mapState);
        for (const service_request of response.data) {
          // Only add initial settings if we don't already have them.
          if (!current_ids.includes(String(service_request.id))) {
            const total_matches = countMatches(service_request);
            const matches = total_matches[0];
            const status_matches = total_matches[1];
            let color = 'yellow';
            if (service_request.reported_animals > 0) {
              color = 'red';
            }
            map_dict[service_request.id] = {color:color, checked:false, hidden:false, matches:matches, status_matches:status_matches, radius:"disabled", has_reported_animals:service_request.reported_animals > 0, latitude:service_request.latitude, longitude:service_request.longitude};
          }
          bounds.push([service_request.latitude, service_request.longitude]);
        }
        setMapState(map_dict);
        if (bounds.length > 0) {
          setData(prevState => ({ ...prevState, ["bounds"]:L.latLngBounds(bounds) }));
        }
      })
      .catch(error => {
        console.log(error.response);
        setData({service_requests: [], isFetching: false, bounds:L.latLngBounds([[0,0]])});
      });
    };

    fetchTeamMembers();
    fetchServiceRequests();

    // Cleanup.
    return () => {
      source.cancel();
    };
  }, [statusOptions]);

  return (
    <Formik
      initialValues={{
        team_members: [],
        service_requests: [],
      }}
      onSubmit={(values, { setSubmitting }) => {
        values.service_requests = Object.keys(mapState).filter(key => mapState[key].checked === true)
        setTimeout(() => {
          axios.post('/evac/api/evacassignment/', values)
          .then(response => {
            navigate('/evac/summary/' + response.data.id);
          })
          .catch(error => {
            console.log(error.response);
          });
          setSubmitting(false);
        }, 500);
      }}
    >
    {props => (
      <Form>
        <Row className="d-flex flex-wrap" style={{marginTop:"10px", marginRight:"-7px"}}>
          <Col xs={2} className="border rounded" style={{marginLeft:"-5px", marginRight:"5px"}}>
            <div className="card-header border rounded mt-3 text-center" style={{paddingRight:"15px", paddingLeft:"15px"}}>
              <p className="mb-2" style={{marginTop:"-5px"}}>Reported
                <OverlayTrigger
                  key={"selected-reported"}
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-selected-reported`}>
                      Reported
                    </Tooltip>
                  }
                >
                  <FontAwesomeIcon icon={faExclamationCircle} className="ml-1"/>
                </OverlayTrigger>
              </p>
              <hr className="mt-1 mb-1"/>
              {Object.keys(totalSelectedState["REPORTED"]).map(key => (
                <div key={key} style={{textTransform:"capitalize", marginTop:"5px", marginBottom:"-5px"}}>{prettyText(key.split(',')[1], key.split(',')[0], totalSelectedState["REPORTED"][key])}</div>
              ))}
            </div>
            <div className="card-header border rounded mt-3 text-center" style={{paddingRight:"15px", paddingLeft:"15px"}}>
              <p className="mb-2" style={{marginTop:"-5px"}}>SIP
                <OverlayTrigger
                  key={"selected-sip"}
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-selected-sip`}>
                      Sheltered In Place
                    </Tooltip>
                  }
                >
                  <span className="fa-layers fa-fw ml-1">
                    <FontAwesomeIcon icon={faCircle} transform={'grow-1'} />
                    <FontAwesomeIcon icon={faHomeAlt} style={{color:"#444"}} transform={'shrink-3'} size="sm" inverse />
                  </span>
                </OverlayTrigger>
              </p>
              <hr className="mt-1 mb-1"/>
              {Object.keys(totalSelectedState["SHELTERED IN PLACE"]).map(key => (
                <div key={key} style={{textTransform:"capitalize", marginTop:"5px", marginBottom:"-5px"}}>{prettyText(key.split(',')[1], key.split(',')[0], totalSelectedState["SHELTERED IN PLACE"][key])}</div>
              ))}
            </div>
            <div className="card-header border rounded mt-3 mb-3 text-center" style={{paddingRight:"15px", paddingLeft:"15px"}}>
              <p className="mb-2" style={{marginTop:"-5px"}}>UTL
                <OverlayTrigger
                  key={"selected-utl"}
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-selected-utl`}>
                      Unable To Locate
                    </Tooltip>
                  }
                >
                  <FontAwesomeIcon icon={faQuestionCircle} className="ml-1"/>
                </OverlayTrigger>
              </p>
              <hr className="mt-1 mb-1"/>
              {Object.keys(totalSelectedState["UNABLE TO LOCATE"]).map(key => (
                <div key={key} style={{textTransform:"capitalize", marginTop:"5px", marginBottom:"-5px"}}>{prettyText(key.split(',')[1], key.split(',')[0], totalSelectedState["UNABLE TO LOCATE"][key])}</div>
              ))}
            </div>
          </Col>
          <Col xs={10} className="border rounded pl-0 pr-0">
            <Map className="d-block" style={{marginRight:"0px"}} bounds={data.bounds} onMoveEnd={onMove}>
              <Legend position="bottomleft" metric={false} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              />
              {data.service_requests.map(service_request => (
                <CircleMarker
                  key={service_request.id}
                  center={{lat:service_request.latitude, lng: service_request.longitude}}
                  color="black"
                  weight="1"
                  fillColor={mapState[service_request.id] ? mapState[service_request.id].color : ""}
                  fill={true}
                  fillOpacity="1"
                  onClick={() => handleMapState(service_request.id)}
                  radius={5}
                >
                  <MapTooltip autoPan={false}>
                    <span>
                      {mapState[service_request.id] ?
                        <span>
                          {Object.keys(mapState[service_request.id].matches).map((key,i) => (
                            <span key={key} style={{textTransform:"capitalize"}}>
                              {i > 0 && ", "}{prettyText(key.split(',')[1], key.split(',')[0], mapState[service_request.id].matches[key])}
                            </span>
                          ))}
                        </span>
                      :""}
                      <br />
                      {service_request.full_address}
                      {service_request.followup_date ? <div>Followup Date: <Moment format="L">{service_request.followup_date}</Moment></div> : ""}
                      <div>
                        {service_request.reported_animals > 0 ? <img width={16} height={16} src={reported} alt="" /> : ""}
                        {service_request.sheltered_in_place > 0 ? <img width={16} height={16} src={sip} alt="" /> : ""}
                        {service_request.unable_to_locate > 0 ? <img width={16} height={16} src={utl} alt="" /> : ""}
                        {service_request.aco_required ? <img width={16} height={16} src={badge} alt="" className="mr-1" /> : ""}
                        {service_request.injured ? <img width={16} height={16} src={bandaid} alt="" className="mr-1" /> : ""}
                        {service_request.accessible ? <img width={16} height={16} src={car} alt="" className="mr-1" /> : ""}
                        {service_request.turn_around ? <img width={16} height={16} src={trailer} alt="" /> : ""}
                      </div>
                    </span>
                  </MapTooltip>
                </CircleMarker>
              ))}
              {Object.entries(mapState).filter(([key, value]) => value.radius === "enabled").map(([key, value]) => (
                <Circle key={key} center={{lat:value.latitude, lng: value.longitude}} radius={805} interactive={false} />
              ))}
            </Map>
          </Col>
        </Row>
        <Row className="mt-2" style={{}}>
          <Col xs={2} className="pl-0" style={{marginLeft:"-7px", paddingRight:"2px"}}>
            <Button type="submit" className="btn-block mt-auto" style={{marginBottom:"-33px"}} disabled={selectedCount.disabled || props.values.team_members.length === 0}>DEPLOY</Button>
          </Col>
          <Col xs={10} className="pl-0">
            <Typeahead
              id="team_members"
              multiple
              onChange={(values) => {props.setFieldValue('team_members', values.map(item => item.id))}}
              options={teamData.options}
              placeholder="Choose team members..."
              style={{marginLeft:"3px", marginRight:"-13px"}}
            />
          </Col>
        </Row>
        <Row className="d-flex flex-wrap" style={{marginTop:"8px", marginRight:"-20px", marginLeft:"-14px", minHeight:"36vh", paddingRight:"14px"}}>
          <Col xs={2} className="d-flex flex-column pl-0 pr-0" style={{marginLeft:"-7px", marginRight:"5px"}}>
            <div className="card-header border rounded pl-3 pr-3" style={{height:"100%"}}>
              <h5 className="mb-0 text-center">Options</h5>
              <hr/>
              <FormCheck id="aco_required" name="aco_required" type="switch" label="ACO Required" checked={statusOptions.aco_required} onChange={handleACO} />
              <FormCheck id="pending_only" className="mt-3" name="pending_only" type="switch" label="Pending Only" checked={statusOptions.pending_only} onChange={handlePendingOnly} />
            </div>
          </Col>
          <Col xs={10} className="border rounded" style={{marginLeft:"1px", height:"36vh", overflowY:"auto", paddingRight:"-1px"}}>
            {data.service_requests.map(service_request => (
              <span key={service_request.id}>{mapState[service_request.id] && (mapState[service_request.id].checked || !mapState[service_request.id].hidden) ?
              <div className="mt-1 mb-1" style={{marginLeft:"-10px", marginRight:"-10px"}}>
                <div className="card-header">
                  <span style={{display:"inline"}} className="custom-control-lg custom-control custom-checkbox">
                    <input className="custom-control-input" type="checkbox" name={service_request.id} id={service_request.id} onChange={() => handleMapState(service_request.id)} checked={mapState[service_request.id] ? mapState[service_request.id].checked : false} />
                    <label className="custom-control-label" htmlFor={service_request.id}></label>
                  </span>
                  {mapState[service_request.id] ?
                  <span>
                    {Object.keys(mapState[service_request.id].matches).map((key,i) => (
                      <span key={key} style={{textTransform:"capitalize"}}>
                        {i > 0 && ", "}{prettyText(key.split(',')[1], key.split(',')[0], mapState[service_request.id].matches[key])}
                      </span>
                    ))}
                  </span>
                  :""}
                  {service_request.reported_animals > 0 ?
                  <OverlayTrigger
                    key={"reported"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-reported`}>
                        {service_request.reported_animals} animal{service_request.reported_animals > 1 ? "s are":" is"} reported
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faExclamationCircle} className="ml-1"/>
                  </OverlayTrigger>
                  : ""}
                  {service_request.sheltered_in_place > 0 ?
                  <OverlayTrigger
                    key={"sip"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-sip`}>
                        {service_request.sheltered_in_place} animal{service_request.sheltered_in_place > 1 ? "s are":" is"} sheltered in place
                      </Tooltip>
                    }
                  >
                    <span className="fa-layers fa-fw ml-1">
                      <FontAwesomeIcon icon={faCircle} transform={'grow-1'} />
                      <FontAwesomeIcon icon={faHomeAlt} style={{color:"#444"}} transform={'shrink-3'} size="sm" inverse />
                    </span>
                  </OverlayTrigger>
                  : ""}
                  {service_request.unable_to_locate > 0 ?
                  <OverlayTrigger
                    key={"utl"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-utl`}>
                        {service_request.unable_to_locate} animal{service_request.unable_to_locate > 1 ? "s are":" is"} unable to be located
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faQuestionCircle} className="ml-1"/>
                  </OverlayTrigger>
                  : ""}
                  {service_request.aco_required ?
                  <OverlayTrigger
                    key={"aco"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-aco`}>
                        ACO required
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faBadgeSheriff} className="ml-1"/>
                  </OverlayTrigger>
                  : ""}
                  {service_request.injured ?
                  <OverlayTrigger
                    key={"injured"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-injured`}>
                        Injured animal
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faBandAid} className="ml-1"/>
                  </OverlayTrigger>
                  : ""}
                  {service_request.accessible ?
                  <OverlayTrigger
                    key={"accessible"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-accessible`}>
                        Easily accessible
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faCar} className="ml-1"/>
                  </OverlayTrigger>
                  : ""}
                  {service_request.turn_around ?
                  <OverlayTrigger
                    key={"turnaround"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-turnaround`}>
                        Room to turn around
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faTrailer} className="ml-1"/>
                  </OverlayTrigger>
                  : ""}
                  <span className="ml-2">| &nbsp;{service_request.full_address}</span>
                  <OverlayTrigger
                    key={"radius-toggle"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-radius-toggle`}>
                        Toggle 1 mile radius
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faBullseye} color={mapState[service_request.id].radius === "enabled" ? "red" : ""} className="ml-1 mr-1" style={{cursor:'pointer'}} onClick={() => handleRadius(service_request.id)} />
                  </OverlayTrigger>
                  <OverlayTrigger
                    key={"request-details"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-request-details`}>
                        Service request details
                      </Tooltip>
                    }
                  >
                    <Link href={"/hotline/servicerequest/" + service_request.id} target="_blank"><FontAwesomeIcon icon={faClipboardList} inverse /></Link>
                  </OverlayTrigger>
                </div>
              </div>
              : ""}
              </span>
            ))}
            <div className="card-header mt-1 mb-1"  style={{marginLeft:"-10px", marginRight:"-10px"}} hidden={data.service_requests.length > 0}>
              No open Service Requests found.
            </div>
          </Col>
        </Row>
      </Form>
    )}
  </Formik>
  )
}

export default Deploy;

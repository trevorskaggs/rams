import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from 'raviger';
import { Button, Col, ListGroup, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { Marker, Tooltip as MapTooltip } from "react-leaflet";
import L from "leaflet";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import Map, { countMatches, prettyText, reportedMarkerIcon, SIPMarkerIcon, UTLMarkerIcon } from "../components/Map";
import Header from "../components/Header";
import Scrollbar from '../components/Scrollbars';
import { S3_BUCKET } from '../constants';

function Dispatch() {

  const [data, setData] = useState({dispatch_assignments: [], isFetching: false, bounds:L.latLngBounds([[0,0]])});
  const [mapState, setMapState] = useState({});
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchServiceRequests = async () => {

      // Fetch open DA data.
      axios.get('/evac/api/evacassignment/', {
        params: {
          status: 'open',
          map: true
        },
        cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          const map_dict = {};
          const bounds = [];
          response.data.forEach((dispatch_assignment, index) => {
            let sr_dict = {}
            for (const assigned_request of dispatch_assignment.assigned_requests) {
              const matches = countMatches(assigned_request.service_request_object)[0];
              sr_dict[assigned_request.service_request_object.id] = {id:assigned_request.service_request_object.id, matches:matches, latitude:assigned_request.service_request_object.latitude, longitude:assigned_request.service_request_object.longitude, full_address:assigned_request.service_request_object.full_address};
              bounds.push([assigned_request.service_request_object.latitude, assigned_request.service_request_object.longitude]);
            }
            map_dict[dispatch_assignment.id] = {service_requests:sr_dict}
          });
          setMapState(map_dict);
          setData({dispatch_assignments: response.data, isFetching: false, bounds:bounds.length > 0 ? bounds : L.latLngBounds([[0,0]])});
        }
      })
      .catch(error => {
        if (!unmounted) {
          setData({dispatch_assignments: [], isFetching: false, bounds:L.latLngBounds([[0,0]])});
        }
      });
    };

    fetchServiceRequests();

    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, []);

  return (
    <>
    <Header>Dispatch</Header>
    <hr/>
    <Row className="mr-0">
      <Col xs={4} className="mr-0 pr-0">
        <ListGroup className="flex-fill" style={{marginRight:"15px"}}>
          <Link href="/dispatch/dispatchteammember/new">
            <ListGroup.Item className="rounded" action>ADD TEAM MEMBER</ListGroup.Item>
          </Link>
          <Link href="/dispatch/deploy">
            <ListGroup.Item className="rounded" action>DEPLOY TEAMS</ListGroup.Item>
          </Link>
          <Link href="/dispatch/dispatchassignment/search">
            <ListGroup.Item className="rounded" action>SEARCH DISPATCH ASSIGNMENTS</ListGroup.Item>
          </Link>
        </ListGroup>
      </Col>
      <Col xs={8} className="ml-0 mr-0 pl-0 pr-0">
        <Row xs={12} className="ml-0 mr-0 pl-0 pr-0" style={{marginBottom:"-1px"}}>
          <Col xs={9} className="border rounded pl-0 pr-0">
            <Map bounds={data.bounds} boundsOptions={{padding:[10,10]}} className="landing-leaflet-container">
              {data.dispatch_assignments.filter(dispatch_assignment => (selectedTeam == null || dispatch_assignment.team === selectedTeam)).map(dispatch_assignment => (
              <span key={dispatch_assignment.id}>
                {dispatch_assignment.assigned_requests.map(assigned_request => (
                  <Marker
                    key={assigned_request.service_request_object.id}
                    position={[assigned_request.service_request_object.latitude, assigned_request.service_request_object.longitude]}
                    icon={assigned_request.service_request_object.sheltered_in_place > 0 ? SIPMarkerIcon : assigned_request.service_request_object.unable_to_locate > 0 ? UTLMarkerIcon : reportedMarkerIcon}
                    onClick={() => window.open("/dispatch/summary/" + dispatch_assignment.id)}
                  >
                  <MapTooltip autoPan={false}>
                    <span>
                      <div>{dispatch_assignment.team_object ? dispatch_assignment.team_object.name : ""}:&nbsp;
                      {dispatch_assignment.team && dispatch_assignment.team_object.team_member_objects.map((team_member, i) => (
                        <span key={team_member.id}>{i > 0 && ", "}{team_member.first_name + ' ' + team_member.last_name}{team_member.agency_id ? <span>&nbsp;({team_member.agency_id})</span> : ""}</span>
                      ))}
                      </div>
                      {mapState[dispatch_assignment.id] ?
                        <span>
                          {Object.keys(mapState[dispatch_assignment.id].service_requests[assigned_request.service_request_object.id].matches).map((key,i) => (
                            <span key={key} style={{textTransform:"capitalize"}}>
                              {i > 0 && ", "}{prettyText(key.split(',')[1], key.split(',')[0], mapState[dispatch_assignment.id].service_requests[assigned_request.service_request_object.id].matches[key])}
                            </span>
                          ))}
                        </span>
                      :""}
                      <br />
                      #{assigned_request.service_request_object.id}: {assigned_request.service_request_object.full_address}
                      <div>
                        {assigned_request.service_request_object.aco_required ? <img width={16} height={16} src={`${S3_BUCKET}images/badge-sheriff.png`} alt="ACO Required" className="mr-1" /> : ""}
                        {assigned_request.service_request_object.injured ? <img width={16} height={16} src={`${S3_BUCKET}images/band-aid-solid.png`} alt="Injured" className="mr-1" /> : ""}
                        {assigned_request.service_request_object.accessible ? <img width={16} height={16} src={`${S3_BUCKET}images/car-solid.png`} alt="Accessible" className="mr-1" /> : ""}
                        {assigned_request.service_request_object.turn_around ? <img width={16} height={16} src={`${S3_BUCKET}images/trailer-solid.png`} alt="Turn Around" /> : ""}
                      </div>
                    </span>
                  </MapTooltip>
                </Marker>
                ))}
              </span>
              ))}
            </Map>
          </Col>
          <Col xs={3} className="ml-0 mr-0 pl-0 pr-0 border rounded">
            <Scrollbar no_shadow="true" style={{height:"350px"}} renderThumbHorizontal={props => <div {...props} style={{...props.style, display: 'none'}} />}>
            <Button variant={selectedTeam === null ? "primary" : "secondary"} className="border" onClick={() => setSelectedTeam(null)} style={{maxHeight:"36px", width:"100%", marginTop:"-1px"}}>All</Button>
            {data.dispatch_assignments.map(dispatch_assignment => (
              <Button key={dispatch_assignment.id} title={dispatch_assignment.team ? dispatch_assignment.team.name : ""} variant={dispatch_assignment.team === selectedTeam ? "primary" : "secondary"} className="border" onClick={() => setSelectedTeam(dispatch_assignment.team)} style={{maxHeight:"36px", width:"100%", marginTop:"-1px"}}>
                {dispatch_assignment.team ? dispatch_assignment.team_object.name : "Team"}
                {dispatch_assignment.team ?
                  <OverlayTrigger
                    key={"team-names"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-team-names`}>
                        {dispatch_assignment.team_member_names}
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faUsers} className="ml-1" />
                  </OverlayTrigger>
                : ""}
              </Button>
            ))}
            </Scrollbar>
          </Col>
        </Row>
        <Row className="ml-0 mr-0 border rounded" style={{maxHeight:"38px"}}>
          <h4 className="card-header text-center" style={{paddingTop:"4px", paddingLeft:"10px", paddingRight:"10px", height:"36px", width:"100%", backgroundColor:"#808080"}}>Active Dispatch Assignments</h4>
        </Row>
      </Col>
    </Row>
    </>
  )
}

export default Dispatch

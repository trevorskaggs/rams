import React, { useEffect, useState, useRef } from 'react';
import axios from "axios";
import { Link, useQueryParams } from 'raviger';
import { Button, ButtonGroup, Card, CardGroup, Form, FormControl, InputGroup, ListGroup, OverlayTrigger, Pagination, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList, faEnvelope, faUsers
} from '@fortawesome/free-solid-svg-icons';
import {
  faDotCircle
} from '@fortawesome/free-regular-svg-icons';
import { faPhoneRotary } from '@fortawesome/pro-solid-svg-icons';
import Moment from 'react-moment';
import Header from '../components/Header';
import Scrollbar from '../components/Scrollbars';
import { ITEMS_PER_PAGE } from '../constants';

function ServiceRequestSearch() {

  // Identify any query param data.
  const [queryParams] = useQueryParams();
  const {
    search = '',
    status = 'open',
  } = queryParams;

  const [data, setData] = useState({service_requests: [], isFetching: false});
  const [searchState, setSearchState] = useState({});
  const [searchTerm, setSearchTerm] = useState(search);
  const [tempSearchTerm, setTempSearchTerm] = useState(search);
  const [statusOptions, setStatusOptions] = useState(status);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const topRef = useRef(null);

  // Update searchTerm when field input changes.
  const handleChange = event => {
    setTempSearchTerm(event.target.value);
  };

  // Use searchTerm to filter service_requests.
  const handleSubmit = async event => {
    event.preventDefault();
    setSearchTerm(tempSearchTerm);
  }

  function setFocus(pageNum) {
    if (pageNum !== page) {
      topRef.current.focus();
    }
  }

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchServiceRequests = async () => {
      setData({service_requests: [], isFetching: true});
      // Fetch ServiceRequest data.
      await axios.get('/hotline/api/servicerequests/?search=' + searchTerm + '&status=' + statusOptions, {
        cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          setNumPages(Math.ceil(response.data.length / ITEMS_PER_PAGE));
          setData({service_requests: response.data, isFetching: false});
          let search_state = {};
					response.data.forEach(service_request => {
						let species = [];
						service_request.animals.forEach(animal => {
							if (!species.includes(animal.species)) {
								species.push(animal.species)
							}
						});
            let sortOrder = ['cat', 'dog', 'horse', 'other'];
            species.sort(function(a, b) {
              return sortOrder.indexOf(a) - sortOrder.indexOf(b);
            });
						search_state[service_request.id] = {species:species, selectedSpecies:species[0]};
					});
					setSearchState(search_state);
        }
      })
      .catch(error => {
        if (!unmounted) {
          setData({service_requests: [], isFetching: false});
        }
      });
    };
    fetchServiceRequests();
    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, [searchTerm, statusOptions]);

  return (
    <div className="ml-2 mr-2">
      <Header>Search Service Requests</Header>
      <hr/>
      <Form onSubmit={handleSubmit}>
        <InputGroup className="mb-3">
          <FormControl
            type="text"
            placeholder="Search"
            name="searchTerm"
            value={tempSearchTerm}
            onChange={handleChange}
            ref={topRef}
          />
          <InputGroup.Append>
            <Button variant="outline-light" type="submit" style={{borderRadius:"0 5px 5px 0"}}>Search</Button>
          </InputGroup.Append>
          <ButtonGroup className="ml-3">
            <Button variant={statusOptions === "open" ? "primary" : "secondary"} onClick={statusOptions !== "open" ? () => {setPage(1);setStatusOptions("open")} : () => {setPage(1);setStatusOptions("")}}>Open</Button>
            <Button variant={statusOptions === "assigned" ? "primary" : "secondary"} onClick={statusOptions !== "assigned" ? () => {setPage(1);setStatusOptions("assigned")} : () => {setPage(1);setStatusOptions("")}}>Assigned</Button>
            <Button variant={statusOptions === "closed" ? "primary" : "secondary"} onClick={statusOptions !== "closed" ? () => {setPage(1);setStatusOptions("closed")} : () => {setPage(1);setStatusOptions("")}}>Closed</Button>
            <Button variant={statusOptions === "canceled" ? "primary" : "secondary"} onClick={statusOptions !== "canceled" ? () => {setPage(1);setStatusOptions("canceled")} : () => {setPage(1);setStatusOptions("")}}>Canceled</Button>
          </ButtonGroup>
        </InputGroup>
      </Form>
      {data.service_requests.map((service_request, index) => (
        <div key={service_request.id} className="mt-3" hidden={page !== Math.ceil((index+1)/ITEMS_PER_PAGE)}>
          <div className="card-header">
            <h4 style={{marginBottom:"-2px",  marginLeft:"-12px"}}>
              <OverlayTrigger
                key={"request-details"}
                placement="top"
                overlay={
                  <Tooltip id={`tooltip-request-details`}>
                    Service request details
                  </Tooltip>
                }
              >
                <Link href={"/hotline/servicerequest/" + service_request.id}><FontAwesomeIcon icon={faDotCircle} className="mr-2" inverse /></Link>
              </OverlayTrigger>
              #{service_request.id}
              &nbsp;-&nbsp;{service_request.full_address}
              &nbsp;| <span style={{textTransform:"capitalize"}}>{service_request.status}</span>
            </h4>
          </div>
          <CardGroup>
            <Card style={{marginBottom:"6px"}}>
              <Card.Body>
                <Card.Title style={{marginTop:"-9px", marginBottom:"8px"}}>Information</Card.Title>
                <Scrollbar style={{height:"144px"}} renderThumbHorizontal={props => <div {...props} style={{...props.style, display: 'none'}} />}>
                  <ListGroup>
                    <ListGroup.Item>
                    {service_request.evacuation_assignments.filter(da => da.start_time === service_request.evacuation_assignments.map(da => da.start_time).sort().reverse()[0]).map(dispatch_assignment =>
                      <span key={dispatch_assignment.id}>
                        <b>{dispatch_assignment.end_time ? "Last" : "Active"} Dispatch Assignment: </b>
                        <Link href={"/dispatch/summary/" + dispatch_assignment.id} className="text-link" style={{textDecoration:"none", color:"white"}}><Moment format="L">{dispatch_assignment.start_time}</Moment></Link>&nbsp;
                        |&nbsp;{dispatch_assignment.team_name}
                        <OverlayTrigger
                          key={"team-names"}
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-team-names`}>
                              {dispatch_assignment.team_member_names}
                            </Tooltip>
                          }
                        >
                          <FontAwesomeIcon icon={faUsers} className="ml-1 fa-move-down" />
                        </OverlayTrigger>
                      </span>
                    )}
                    {service_request.evacuation_assignments.length === 0 ?
                      <span>
                        <b>Dispatch Assignment: </b>
                        Never Serviced
                      </span>
                    : ""}
                    </ListGroup.Item>
                    {service_request.owner_objects.map(owner => (
                      <ListGroup.Item key={owner.id}>
                        <b>Owner: </b><Link href={"/people/owner/" + owner.id} className="text-link" style={{textDecoration:"none", color:"white"}}>{owner.first_name} {owner.last_name}</Link>
                        {owner.display_phone ?
                        <OverlayTrigger
                          key={"owner-phone"}
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-owner-phone`}>
                              Phone: {owner.display_phone}
                            </Tooltip>
                          }
                        >
                          <FontAwesomeIcon icon={faPhoneRotary} className="ml-1" inverse />
                        </OverlayTrigger>
                        : ""}
                        {owner.email ?
                        <OverlayTrigger
                          key={"owner-email"}
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-owner-email`}>
                              Email: {owner.email}
                            </Tooltip>
                          }
                        >
                          <FontAwesomeIcon icon={faEnvelope} className="ml-1" inverse />
                        </OverlayTrigger>
                        : ""}
                      </ListGroup.Item>
                    ))}
                    {service_request.owners.length < 1 ? <ListGroup.Item><b>Owner: </b>No Owner</ListGroup.Item> : ""}
                    <ListGroup.Item><b>Reporter: </b>{service_request.reporter ? <Link href={"/people/reporter/" + service_request.reporter} className="text-link" style={{textDecoration:"none", color:"white"}}>{service_request.reporter_object.first_name} {service_request.reporter_object.last_name}</Link> : "No Reporter"}</ListGroup.Item>
                  </ListGroup>
                </Scrollbar>
              </Card.Body>
            </Card>
            {searchState[service_request.id] ?
              <Card style={{marginBottom:"6px"}}>
                <Card.Body>
                  <Card.Title style={{marginTop:"-10px"}}>
                    <ListGroup horizontal>
                    {searchState[service_request.id].species.map(species => (
                      <ListGroup.Item key={species} active={searchState[service_request.id].selectedSpecies === species ? true : false} style={{textTransform:"capitalize", cursor:'pointer', paddingTop:"4px", paddingBottom:"4px"}} onClick={() => setSearchState(prevState => ({ ...prevState, [service_request.id]:{...prevState[service_request.id], selectedSpecies:species} }))}>{species}{species !== "other" ? "s" : ""}</ListGroup.Item>
                    ))}
                    </ListGroup>
                  </Card.Title>
                  <ListGroup style={{height:"144px", overflowY:"auto", marginTop:"-12px"}}>
                    <Scrollbar style={{height:"144px"}} renderThumbHorizontal={props => <div {...props} style={{...props.style, display: 'none'}} />}>
                      {service_request.animals.filter(animal => animal.species === searchState[service_request.id].selectedSpecies).map((animal, i) => (
                        <ListGroup.Item key={animal.id}>
                          <b>#{animal.id}:</b>&nbsp;&nbsp;<Link href={"/animals/" + animal.id} className="text-link" style={{textDecoration:"none", color:"white"}}>{animal.name || "Unknown"}</Link>
                          {animal.color_notes ?
                          <OverlayTrigger
                            key={"animal-color-notes"}
                            placement="top"
                            overlay={
                              <Tooltip id={`tooltip-animal-color-notes`}>
                                {animal.color_notes}
                              </Tooltip>
                            }
                          >
                            <FontAwesomeIcon icon={faClipboardList} style={{marginLeft:"3px"}} size="sm" inverse />
                          </OverlayTrigger>
                          : ""}
                          &nbsp;- {animal.status}
                        </ListGroup.Item>
                      ))}
                    {service_request.animals.length < 1 ? <ListGroup.Item style={{marginTop:"32px"}}>No Animals</ListGroup.Item> : ""}
                    </Scrollbar>
                  </ListGroup>
              </Card.Body>
            </Card>
            : ""}
          </CardGroup>
        </div>
      ))}
      <p>{data.isFetching ? 'Fetching service requests...' : <span>{data.service_requests && data.service_requests.length ? '' : 'No Service Requests found.'}</span>}</p>
      <Pagination className="custom-page-links" size="lg" onClick={(e) => {setFocus(parseInt(e.target.innerText));setPage(parseInt(e.target.innerText))}}>
        {[...Array(numPages).keys()].map(x =>
        <Pagination.Item key={x+1} active={x+1 === page}>
          {x+1}
        </Pagination.Item>)
        }
      </Pagination>
    </div>
  )
}

export default ServiceRequestSearch;

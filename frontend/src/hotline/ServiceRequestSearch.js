import React, { useContext, useEffect, useState, useRef } from 'react';
import axios from "axios";
import { Link, useQueryParams } from 'raviger';
import { Button, ButtonGroup, Card, CardGroup, Form, FormControl, InputGroup, ListGroup, OverlayTrigger, Pagination, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan, faCar, faChevronDown, faChevronUp, faEquals, faClipboardList, faEnvelope, faKey, faTrailer, faUsers, faPrint
} from '@fortawesome/free-solid-svg-icons';
import {
  faDotCircle
} from '@fortawesome/free-regular-svg-icons';
import { faChevronDoubleDown, faChevronDoubleUp, faCommentSmile, faPhoneRotary } from '@fortawesome/pro-solid-svg-icons';
import Moment from 'react-moment';
import { useMark, useSubmitting } from '../hooks';
import Header from '../components/Header';
import Scrollbar from '../components/Scrollbars';
import { speciesChoices } from '../animals/constants';
import { ITEMS_PER_PAGE } from '../constants';
import { SystemErrorContext } from '../components/SystemError';
import ButtonSpinner from '../components/ButtonSpinner';
import { printAllServiceRequests } from './Utils';

function ServiceRequestSearch({ incident }) {

  const { setShowSystemError } = useContext(SystemErrorContext);

  // Identify any query param data.
  const [queryParams] = useQueryParams();
  const {
    search = '',
    status = 'open',
  } = queryParams;

  const priorityText = {1:'Highest', 2:'High', 3:'Medium', 4:'Low', 5:'Lowest'};

  const [data, setData] = useState({service_requests: [], isFetching: false});
  const [searchState, setSearchState] = useState({});
  const [searchTerm, setSearchTerm] = useState(search);
  const tempSearchTerm = useRef(null);
  const [statusOptions, setStatusOptions] = useState(status);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const { markInstances } = useMark();
  const {
    isSubmitting,
    handleSubmitting,
    submittingComplete,
    submittingLabel
  } = useSubmitting();

  // Update searchTerm when field input changes.
  const handleChange = event => {
    tempSearchTerm.current.value = event.target.value;
  };

  // Use searchTerm to filter service_requests.
  const handleSubmit = async event => {
    event.preventDefault();
    setSearchTerm(tempSearchTerm.current.value);
    setPage(1);
  }

  const handlePrintAllClick = (e) => {
    e.preventDefault();

    handleSubmitting()
      .then(() => printAllServiceRequests(data.service_requests))
      .then(submittingComplete);
  }

  function setFocus(pageNum) {
    if (pageNum !== page) {
      tempSearchTerm.current.focus();
    }
  }

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchServiceRequests = async () => {
      setData({service_requests: [], isFetching: true});
      // Fetch ServiceRequest data.
      await axios.get('/hotline/api/servicerequests/?search=' + searchTerm + '&status=' + statusOptions +'&incident=' + incident, {
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
            let sortOrder = speciesChoices.map(sc => sc.value);
            species.sort(function(a, b) {
              return sortOrder.indexOf(a) - sortOrder.indexOf(b);
            });
						search_state[service_request.id] = {species:species, selectedSpecies:species[0]};
					});
					setSearchState(search_state);

          // highlight search terms
          markInstances(searchTerm);
        }
      })
      .catch(error => {
        if (!unmounted) {
          setData({service_requests: [], isFetching: false});
          setShowSystemError(true);
        }
      });
    };
    fetchServiceRequests();
    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, [searchTerm, statusOptions, incident]);

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
            onChange={handleChange}
            ref={tempSearchTerm}
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
          <ButtonSpinner
            variant="outline-light"
            className="ml-1"
            onClick={handlePrintAllClick}
            isSubmitting={isSubmitting}
            isSubmittingText={submittingLabel}
          >
            Print All ({`${data.service_requests.length}`})
            <FontAwesomeIcon icon={faPrint} className="ml-2 text-light" inverse />
          </ButtonSpinner>
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
                <Link href={"/" + incident + "/hotline/servicerequest/" + service_request.id}><FontAwesomeIcon icon={faDotCircle} className="mr-2" inverse /></Link>
              </OverlayTrigger>
              SR#{service_request.id}
              &nbsp;-&nbsp;{service_request.full_address}
              &nbsp;| <span style={{textTransform:"capitalize"}}>{service_request.status}</span>
            </h4>
          </div>
          <CardGroup>
            <Card style={{marginBottom:"6px"}}>
              <Card.Body>
                <Card.Title style={{marginTop:"-9px", marginBottom:"8px", marginLeft:"0px"}} className="row">
                  Information
                  {service_request.priority === 1 ?
                    <OverlayTrigger
                      key={"highest"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-highest`}>
                          {priorityText[service_request.priority]} priority
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faChevronDoubleUp} size="sm" className="ml-1 fa-move-down"/>
                    </OverlayTrigger>
                  : service_request.priority === 2 ?
                    <OverlayTrigger
                      key={"high"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-high`}>
                          {priorityText[service_request.priority]} priority
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faChevronUp} size="sm" className="ml-1 fa-move-down"/>
                    </OverlayTrigger>
                  : service_request.priority === 3 ?
                    <OverlayTrigger
                      key={"medium"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-medium`}>
                          {priorityText[service_request.priority]} priority
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faEquals} size="sm" className="ml-1 fa-move-down"/>
                    </OverlayTrigger>
                  : service_request.priority === 4 ?
                    <OverlayTrigger
                      key={"low"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-low`}>
                          {priorityText[service_request.priority]} priority
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faChevronDown} size="sm" className="ml-1 fa-move-down"/>
                    </OverlayTrigger>
                  : service_request.priority === 5 ?
                    <OverlayTrigger
                      key={"lowest"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-lowest`}>
                          {priorityText[service_request.priority]} priority
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faChevronDoubleDown} size="sm" className="ml-1 fa-move-down"/>
                    </OverlayTrigger>
                  : ""}
                  {service_request.verbal_permission ?
                  <OverlayTrigger
                    key={"verbal"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-verbal`}>
                        Verbal permission granted
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faCommentSmile} size="sm" className="ml-1" />
                  </OverlayTrigger> : ""
                  }
                  {service_request.key_provided ?
                  <OverlayTrigger
                    key={"key"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-key`}>
                        Key provided
                      </Tooltip>
                    }
                  >
                    <FontAwesomeIcon icon={faKey} size="sm" className="ml-1" transform={'shrink-2'} />
                  </OverlayTrigger> :
                  <OverlayTrigger
                    key={"no-key"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-no-key`}>
                        No key provided
                      </Tooltip>
                    }
                  >
                    <span className="fa-layers" style={{marginLeft:"2px"}}>
                      <FontAwesomeIcon icon={faKey} size="sm" transform={'shrink-2'} />
                      <FontAwesomeIcon icon={faBan} color="#ef5151" size="sm" transform={'shrink-1'} />
                    </span>
                  </OverlayTrigger>
                  }
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
                    <span className="fa-layers">
                      <FontAwesomeIcon icon={faCar} size="sm" className="ml-1 fa-move-down" />
                    </span>
                  </OverlayTrigger> :
                  <OverlayTrigger
                    key={"not-accessible"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-not-accessible`}>
                        Not easily accessible
                      </Tooltip>
                    }
                  >
                    <span className="fa-layers" style={{marginLeft:"2px"}}>
                      <FontAwesomeIcon icon={faCar} size="sm" className="fa-move-down" />
                      <FontAwesomeIcon icon={faBan} color="#ef5151" size="sm" transform={'shrink-1'} />
                    </span>
                  </OverlayTrigger>
                  }
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
                    <FontAwesomeIcon icon={faTrailer} size="sm" className="ml-2" />
                  </OverlayTrigger> :
                  <OverlayTrigger
                    key={"no-turnaround"}
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-no-turnaround`}>
                        No room to turn around
                      </Tooltip>
                    }
                  >
                    <span className="fa-layers ml-1">
                      <FontAwesomeIcon icon={faTrailer} size="sm" />
                      <FontAwesomeIcon icon={faBan} color="#ef5151" size="sm" transform={'shrink-1'} />
                    </span>
                  </OverlayTrigger>
                  }
                </Card.Title>
                <Scrollbar style={{height:"144px"}} renderThumbHorizontal={props => <div {...props} style={{...props.style, display: 'none'}} />}>
                  <ListGroup>
                    <ListGroup.Item>
                    {service_request.evacuation_assignments.filter(da => da.start_time === service_request.evacuation_assignments.map(da => da.start_time).sort().reverse()[0]).map(dispatch_assignment =>
                      <span key={dispatch_assignment.id}>
                        <b>{dispatch_assignment.end_time ? "Last" : "Active"} Dispatch Assignment: </b>
                        <Link href={"/" + incident + "/dispatch/summary/" + dispatch_assignment.id} className="text-link" style={{textDecoration:"none", color:"white"}}><Moment format="L">{dispatch_assignment.start_time}</Moment></Link>&nbsp;
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
                        <b>Owner: </b><Link href={"/" + incident + "/people/owner/" + owner.id} className="text-link" style={{textDecoration:"none", color:"white"}}>{owner.first_name} {owner.last_name}</Link>
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
                    <ListGroup.Item><b>Reporter: </b>{service_request.reporter ? <Link href={"/" + incident + "/people/reporter/" + service_request.reporter} className="text-link" style={{textDecoration:"none", color:"white"}}>{service_request.reporter_object.first_name} {service_request.reporter_object.last_name}</Link> : "No Reporter"}</ListGroup.Item>
                  </ListGroup>
                </Scrollbar>
              </Card.Body>
            </Card>
            {searchState[service_request.id] ?
              <Card style={{marginBottom:"6px"}}>
                <Card.Body style={{width:"525px"}}>
                  <Card.Title style={{marginTop:"-10px"}}>
                    <Scrollbar horizontal autoHide style={{height:"32px", width:"485px"}} renderView={props => <div {...props} style={{...props.style, marginBottom:"-18px", marginRight:"0px", overflowX:"auto", overflowY: "hidden"}}/>} renderThumbVertical={props => <div {...props} style={{...props.style, display: 'none'}} />}>
                      <ListGroup horizontal>
                      {searchState[service_request.id].species.map(species => (
                        <ListGroup.Item key={species} active={searchState[service_request.id].selectedSpecies === species ? true : false} style={{textTransform:"capitalize", cursor:'pointer', paddingTop:"4px", paddingBottom:"4px"}} onClick={() => setSearchState(prevState => ({ ...prevState, [service_request.id]:{...prevState[service_request.id], selectedSpecies:species} }))}>{species}{["other", "sheep"].includes(species) ? "" : "s"}</ListGroup.Item>
                      ))}
                      </ListGroup>
                    </Scrollbar>
                  </Card.Title>
                  <ListGroup style={{height:"144px", overflowY:"auto", marginTop:"-12px"}}>
                    <Scrollbar style={{height:"144px"}} renderThumbHorizontal={props => <div {...props} style={{...props.style, display: 'none'}} />}>
                      {service_request.animals.filter(animal => animal.species === searchState[service_request.id].selectedSpecies).map((animal, i) => (
                        <ListGroup.Item key={animal.id}>
                          <b>A#{animal.id}:</b>&nbsp;&nbsp;<Link href={"/" + incident + "/animals/" + animal.id} className="text-link" style={{textDecoration:"none", color:"white"}}>{animal.name || "Unknown"}</Link>
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
                    {service_request.animals.length < 1 ? <ListGroup.Item>No Animals</ListGroup.Item> : ""}
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

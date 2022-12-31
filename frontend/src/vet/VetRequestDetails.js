import React, { useContext, useEffect, useState } from 'react';
import axios from "axios";
import Moment from 'react-moment';
import { Link, navigate } from 'raviger';
import { Button, Card, Col, ListGroup, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faPlusSquare,
  faCheckSquare
} from '@fortawesome/free-solid-svg-icons';
import {
  faPrescriptionBottlePill,
  faSquareExclamation,
  faSquareEllipsis
} from '@fortawesome/pro-solid-svg-icons';
import Header from '../components/Header';
import { SystemErrorContext } from '../components/SystemError';

function VetRequestDetails({ id, incident }) {

  const { setShowSystemError } = useContext(SystemErrorContext);

  const priorityText = {urgent:'Urgent', when_available:'When Available'};

  const [data, setData] = useState({id: '', patient:{}, assignee:{}, open: '', assigned:'', closed: '', concern: '', priority: '', diagnosis: '', treatment_plans:[], presenting_complaints:[], animal_object: {id:'', name:'', species:'', sex:'', age:'', size:'', pcolor:'', scolor:'', medical_notes:''}});

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchVetRequestData = async () => {
      // Fetch Room Details data.
      await axios.get('/vet/api/vetrequest/' + id + '/?incident=' + incident, {
          cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          setData(response.data);
          console.log(response.data)
        }
      })
      .catch(error => {
        setShowSystemError(true);
      });
    };
    fetchVetRequestData();
    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, [id, incident]);

  return (
    <>
    <Header>
      Vet Request Details
      <OverlayTrigger
        key={"edit-vet-request"}
        placement="bottom"
        overlay={
          <Tooltip id={`tooltip-edit-vet-request`}>
            Update vet request
          </Tooltip>
        }
      >
        <Link href={"/" + incident + "/vet/vetrequest/edit/" + id}><FontAwesomeIcon icon={faEdit} className="ml-1" inverse /></Link>
      </OverlayTrigger>
    </Header>
    <hr/>
    <div className="row">
      <div className="col-6 d-flex">
        <Card className="border rounded d-flex" style={{width:"100%"}}>
          <Card.Body>
            <Card.Title>
              <h4>Information</h4>
            </Card.Title>
            <hr/>
            <ListGroup variant="flush" style={{marginTop:"-13px", marginBottom:"-13px"}}>
              <ListGroup.Item>
                <div className="row">
                  <span className="col-6"><b>ID: </b>VR#{data.id}</span>
                  <span className="col-6"><b>Priority: </b>{priorityText[data.priority]}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <b>Assignee:</b> {data.assignee_object ? <span>{data.assignee_object.first_name} {data.assignee_object.last_name}</span> : "Unassigned"}
              </ListGroup.Item>
              <ListGroup.Item>
                <b>Presenting Complaints:</b> {data.complaints_text || "None"}
              </ListGroup.Item>
              <ListGroup.Item>
                <b>Concern:</b> {data.concern || "N/A"}
              </ListGroup.Item>
              <ListGroup.Item>
                <b>Diagnosis:</b> {data.diagnosis_text || "N/A"}
              </ListGroup.Item>
            </ListGroup>
          </Card.Body>
        </Card>
      </div>
      <div className="col-6 d-flex pl-0">
        <Card className="border rounded" style={{width:"100%"}}>
          <Card.Body>
            <Card.Title>
              <h4 className="mb-0">Patient</h4>
            </Card.Title>
            <hr/>
            <ListGroup variant="flush" style={{marginTop:"-13px", marginBottom:"-13px"}}>
              <ListGroup.Item>
                <div className="row" style={{textTransform:"capitalize"}}>
                  <span className="col-6"><b>ID:</b> <Link href={"/" + incident + "/animals/" + data.animal_object.id} className="text-link" style={{textDecoration:"none", color:"white"}}>A#{data.animal_object.id}</Link></span>
                  <span className="col-6"><b>Name:</b> {data.animal_object.name||"Unknown"}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="row" style={{textTransform:"capitalize"}}>
                  <span className="col-6"><b>Species:</b> {data.animal_object.species}</span>
                  <span className="col-6"><b>Sex:</b> {data.animal_object.sex||"Unknown"}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="row" style={{textTransform:"capitalize"}}>
                  <span className="col-6"><b>Age:</b> {data.animal_object.age||"Unknown"}</span>
                  <span className="col-6"><b>Size:</b> {data.animal_object.size||"Unknown"}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item style={{textTransform:"capitalize"}}>
                <div className="row">
                  <span className="col-6"><b>Primary Color:</b> {data.animal_object.pcolor||"N/A"}</span>
                  <span className="col-6"><b>Secondary Color:</b> {data.animal_object.scolor||"N/A"}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                  <span><b>Medical Notes:</b> {data.animal_object.medical_notes || "N/A"}</span>
              </ListGroup.Item>
            </ListGroup>
          </Card.Body>
        </Card>
      </div>
    </div>
    <div className="row mt-3">
      <div className="col-12 d-flex">
        <Card className="mb-2 border rounded" style={{width:"100%"}}>
          <Card.Body style={{marginBottom:"-17px"}}>
            <Card.Title>
              <h4 className="mb-0">Treatments
                <OverlayTrigger
                  key={"add-treatment"}
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-add-treatment`}>
                      Add a treatment to this vet request
                    </Tooltip>
                  }
                >
                  <Link href={"/" + incident + "/vet/treatmentplan/new?vetrequest_id=" + id}><FontAwesomeIcon icon={faPlusSquare} className="ml-1" inverse /></Link>
                </OverlayTrigger>
              </h4>
            </Card.Title>
            <hr/>
            {data.treatment_plans.map(treatment_plan => (
              <span key={treatment_plan.id} className="pl-0 pr-0 mr-3 mb-3">
                <Link href={"/" + incident + "/vet/treatmentplan/" + treatment_plan.id} className="shelter-link" style={{textDecoration:"none", color:"white"}}>
                  <Col style={{marginLeft:"-15px", marginRight:"-25px"}} xs={9}>
                    <Card className="border rounded shelter-hover-div" style={{height:"100px", whiteSpace:"nowrap", overflow:"hidden"}}>
                      <div className="row no-gutters hover-div" style={{height:"100px", textTransform:"capitalize", marginRight:"-2px"}}>
                        <Row className="ml-0 mr-0 w-100" style={{flexWrap:"nowrap"}}>
                          <div className="border-right" style={{width:"100px"}}>
                            <FontAwesomeIcon icon={faPrescriptionBottlePill} size="6x" className="ml-1 shelter-icon" style={{marginTop:"5px", paddingRight:"10px"}} inverse />
                          </div>
                          <Col style={{marginLeft:"-5px", marginRight:"-25px"}}>
                            <div className="border" style={{paddingTop:"5px", paddingBottom:"7px", paddingLeft:"10px", marginLeft:"-11px", marginTop: "-1px", fontSize:"18px", width:"100%", backgroundColor:"#615e5e"}}>
                              {treatment_plan.treatment_object.description}
                              <span className="float-right">
                                
                              {treatment_plan.treatment_requests.filter(tr => tr.actual_admin_time !== null).length === treatment_plan.treatment_requests.length ?
                                <OverlayTrigger
                                  key={"complete-treatment-request"}
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tooltip-complete-treatment-request`}>
                                      All treatment requests are completed.
                                    </Tooltip>
                                  }
                                >
                                  <FontAwesomeIcon icon={faCheckSquare} size="3x" className="ml-1 shelter-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
                                </OverlayTrigger>
                                : treatment_plan.treatment_requests.filter(tr => new Date(tr.suggested_admin_time) <= new Date() && tr.actual_admin_time === null).length > 0 ?
                                <OverlayTrigger
                                  key={"awaiting-action-treatment-request"}
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tooltip-awaiting-action-treatment-request`}>
                                      At least one treatment request is awaiting action.
                                    </Tooltip>
                                  }
                                >
                                  <FontAwesomeIcon icon={faSquareExclamation} size="3x" className="ml-1 shelter-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
                                </OverlayTrigger>
                                :
                                <OverlayTrigger
                                  key={"scheduled-treatment-request"}
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tooltip-scheduled-treatment-request`}>
                                      At least one treatment request is scheduled for a future date/time.
                                    </Tooltip>
                                  }
                                >
                                  <FontAwesomeIcon icon={faSquareEllipsis} size="3x" className="ml-1 shelter-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
                                </OverlayTrigger>
                                }
                              </span>
                            </div>
                            <div style={{marginTop:"6px"}}>
                              <Row>
                            <Col>
                              Start: <Moment format="lll">{treatment_plan.start}</Moment></Col>
                              <Col>
                              End: <Moment format="lll">{treatment_plan.end}</Moment></Col></Row>
                            </div>
                            <div>
                              {treatment_plan.treatment_requests.length} Treatment Requests
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Card>
                  </Col>
                </Link>
              </span>
            ))}
            {data.treatment_plans.length < 1 ? <p>No treatments have been created for this request.</p> : ""}
          </Card.Body>
        </Card>
      </div>
    </div>
    {/* <History action_history={data.action_history} /> */}
    </>
  );
};

export default VetRequestDetails;

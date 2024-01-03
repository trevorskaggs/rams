import React, { useContext, useEffect, useState } from 'react';
import axios from "axios";
import Moment from 'react-moment';
import moment from 'moment';
import { Link } from 'raviger';
import { Button, Card, Col, Collapse, ListGroup, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faPlusSquare,
  faTimes,
  faCheckSquare,
} from '@fortawesome/free-solid-svg-icons';
import {
  faPrescriptionBottlePill,
  faSquareExclamation,
  faSquareEllipsis
} from '@fortawesome/pro-solid-svg-icons';
import Header from '../components/Header';
import { SystemErrorContext } from '../components/SystemError';

function VetRequestDetails({ id, incident, organization }) {

  const { setShowSystemError } = useContext(SystemErrorContext);

  const priorityText = {urgent:'Urgent', when_available:'When Available'};

  const [data, setData] = useState({id: '', exam: null, patient:{}, assignee:{}, open: '', assigned:'', closed: '', concern: '', priority: '', diagnosis: '', other_diagnosis:'', treatment_plans:[], presenting_complaints:[], exam_object: {answers:{}}, animal_object: {id:'', name:'', species:'', category:'', sex:'', age:'', size:'', pcolor:'', scolor:'', medical_notes:''}});
  const [examQuestions, setExamQuestions] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const cancelVetRequest = () => {
    axios.patch('/vet/api/vetrequest/' + id + '/', {status:'Canceled'})
    setData(prevState => ({ ...prevState, 'status':'Canceled'}));
    setShowModal(false)
  }

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchExamQuestions = async () => {
      // Fetch exam question data.
      await axios.get('/vet/api/examquestions/', {
        cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          setExamQuestions(response.data);
        }
      })
      .catch(error => {
        setShowSystemError(true);
      });
    };

    const fetchVetRequestData = async () => {
      // Fetch VetRequest Details data.
      await axios.get('/vet/api/vetrequest/' + id + '/?incident=' + incident, {
          cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          setData(response.data);
          fetchExamQuestions();
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
      Veterinary Request #{data.id}
      {data.status !== 'Canceled' ? <OverlayTrigger
        key={"edit-vet-request"}
        placement="bottom"
        overlay={
          <Tooltip id={`tooltip-edit-vet-request`}>
            Update vet request
          </Tooltip>
        }
      >
        <Link href={"/" + organization + "/" + incident + "/vet/vetrequest/edit/" + id}><FontAwesomeIcon icon={faEdit} className="ml-2" inverse /></Link>
      </OverlayTrigger> : ""}
      {data.status !== 'Canceled' ? <OverlayTrigger
        key={"cancel-vet-request"}
        placement="bottom"
        overlay={
          <Tooltip id={`tooltip-cancel-vet-request`}>
            Cancel veterinary request
          </Tooltip>
        }
      >
        <FontAwesomeIcon icon={faTimes} className="ml-1" size="lg" style={{cursor:'pointer'}} inverse onClick={() => {setShowModal(true)}}/>
      </OverlayTrigger> : ""}
    </Header>
    <hr/>
    <div className="row">
      <div className="col-6 d-flex">
        <Card className="border rounded d-flex" style={{width:"100%"}}>
          <Card.Body>
            <Card.Title>
              <h4>
                Information
              </h4>
            </Card.Title>
            <hr/>
            <ListGroup variant="flush" style={{marginTop:"-13px", marginBottom:"-13px"}}>
              <ListGroup.Item>
                <div className="row">
                  <span className="col-6"><b>Status: </b>{data.status}</span>
                  <span className="col-6"><b>Priority: </b>{priorityText[data.priority]}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="row">
                  <span className="col-5">
                    <b>Assignee:</b> {data.assignee_object ? <span>{data.assignee_object.first_name} {data.assignee_object.last_name}</span> : "Unassigned"}
                  </span>
                  <span className="col-7">
                    {data.assigned ? <span><b>Assigned: </b><Moment format="lll">{data.assigned}</Moment></span> : ""}
                  </span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <b>Presenting Complaints:</b> {data.complaints_text || "None"}
              </ListGroup.Item>
              <ListGroup.Item>
                <b>Concern:</b> {data.concern || "N/A"}
              </ListGroup.Item>
              {data.exam ? <ListGroup.Item>
                <b>Diagnosis:</b> {data.diagnosis_text || "N/A"}
              </ListGroup.Item> : ""}
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
                  <span className="col-6"><b>ID:</b> <Link href={"/" + organization + "/" + incident + "/animals/" + data.animal_object.id} className="text-link" style={{textDecoration:"none", color:"white"}}>A#{data.animal_object.id}</Link></span>
                  <span className="col-6"><b>Name:</b> {data.animal_object.name||"Unknown"}</span>
                </div>
              </ListGroup.Item>
              <ListGroup.Item>
                <div className="row" style={{textTransform:"capitalize"}}>
                  <span className="col-6"><b>Species:</b> {data.animal_object.species_string}</span>
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
          {data.exam ?
          <Card.Body style={{marginBottom:"-7px"}}>
            <Card.Title>
              <h4 className="mb-0">Exam Results
                {data.exam && data.status !== 'Canceled' ? <OverlayTrigger
                key={"start-exam"}
                placement="bottom"
                overlay={
                  <Tooltip id={`tooltip-start-exam`}>
                    Edit exam
                  </Tooltip>
                }
              >
                <Link href={"/" + organization + "/" + incident + "/vet/vetrequest/" + id + "/exam/"}><FontAwesomeIcon icon={faEdit} className="ml-1" size="lg" style={{cursor:'pointer'}} inverse /></Link>
              </OverlayTrigger> : ""}
              </h4>
            </Card.Title>
            <hr className="mb-3" />
            <ListGroup variant="flush" style={{marginTop:"-13px", marginBottom:"-13px"}}>
            <ListGroup.Item>
              <div className="row" style={{textTransform:"capitalize"}}>
                <span className="col-3"><b>Performed:</b> {moment(data.exam_object.open).format('MMM Do HH:mm')}</span>
                <span className="col-4"><b>Weight:</b> {data.exam_object.weight}{data.exam_object.weight_unit}</span>
              </div>
            </ListGroup.Item>
            <ListGroup.Item>
              <div className="row" style={{textTransform:"capitalize"}}>
                <span className="col-3"><b>Temperature (F):</b> {data.exam_object.temperature}</span>
                <span className="col-4"><b>Temperature Method:</b> {data.exam_object.temperature_method}</span>
              </div>
            </ListGroup.Item>
            {examQuestions.filter(question => question.categories.includes(data.animal_object.category)).map(question => (
              <ListGroup.Item key={question.id}>
                <div className="row" style={{textTransform:"capitalize"}}>
                  <span className="col-3"><b>{question.name}:</b> {data.exam_object.answers[question.name.toLowerCase().replace(' ','_').replace('/','_')]}</span>
                  <span className="col-4"><b>Notes:</b> {data.exam_object.answers[question.name.toLowerCase().replace(' ','_').replace('/','_') + '_notes']}</span>
                </div>
              </ListGroup.Item>
            ))}
            </ListGroup>
          </Card.Body>
          :
          <Card.Body>
            <Link href={"/" + organization + "/" + incident + "/vet/vetrequest/" + id + "/workflow"}><Button>Start Exam</Button></Link>
          </Card.Body>
          }
        </Card>
      </div>
    </div>
    {data.exam ?
    <div className="row mt-3">
      <div className="col-12 d-flex">
        <Card className="mb-2 border rounded" style={{width:"100%"}}>
          <Card.Body style={{marginBottom:"-19px"}}>
            <Card.Title>
              <h4 className="mb-0">Treatments
                {data.status !== 'Canceled' ? <OverlayTrigger
                  key={"add-treatment"}
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-add-treatment`}>
                      Add a treatment to this vet request
                    </Tooltip>
                  }
                >
                  <Link href={"/" + organization + "/" + incident + "/vet/vetrequest/" + data.id + "/treatment/new"}><FontAwesomeIcon icon={faPlusSquare} className="ml-1" inverse /></Link>
                </OverlayTrigger> : ""}
              </h4>
            </Card.Title>
            <hr className="mb-3" />
            {data.treatment_plans.map(treatment_plan => (
              <Row key={treatment_plan.id} className="ml-0 mb-3">
                <Link href={"/" + organization + "/" + incident + "/vet/treatment/" + treatment_plan.id} className="treatment-link" style={{textDecoration:"none", color:"white"}}>
                  <Card className="border rounded treatment-hover-div" style={{height:"100px", width:"745px", whiteSpace:"nowrap", overflow:"hidden"}}>
                    <div className="row no-gutters hover-div treatment-hover-div" style={{height:"100px", marginRight:"-2px"}}>
                      <Row className="ml-0 mr-0 w-100" style={{flexWrap:"nowrap"}}>
                        <div className="border-right" style={{width:"100px"}}>
                          <FontAwesomeIcon icon={faPrescriptionBottlePill} size="6x" className="ml-1 treatment-icon" style={{marginTop:"5px", paddingRight:"10px"}} inverse />
                        </div>
                        <Col style={{marginLeft:"-5px", marginRight:"-25px"}} className="hover-div">
                          <div className="border treatment-hover-div" style={{paddingTop:"5px", paddingBottom:"7px", paddingLeft:"10px", marginLeft:"-11px", marginTop: "-1px", fontSize:"18px", width:"100%", backgroundColor:"#615e5e"}}>
                            {treatment_plan.treatment_object.description}
                            <span className="float-right">
                            {treatment_plan.status === 'Complete' ?
                              <OverlayTrigger
                                key={"complete-treatment-request"}
                                placement="top"
                                overlay={
                                  <Tooltip id={`tooltip-complete-treatment-request`}>
                                    All treatment requests are completed.
                                  </Tooltip>
                                }
                              >
                                <FontAwesomeIcon icon={faCheckSquare} size="3x" className="ml-1 treatment-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
                              </OverlayTrigger>
                              : treatment_plan.status === 'Awaiting' ?
                              <OverlayTrigger
                                key={"awaiting-action-treatment-request"}
                                placement="top"
                                overlay={
                                  <Tooltip id={`tooltip-awaiting-action-treatment-request`}>
                                    At least one treatment request is awaiting action.
                                  </Tooltip>
                                }
                              >
                                <FontAwesomeIcon icon={faSquareExclamation} size="3x" className="ml-1 treatment-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
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
                                <FontAwesomeIcon icon={faSquareEllipsis} size="3x" className="ml-1 treatment-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
                              </OverlayTrigger>
                              }
                            </span>
                          </div>
                          <div style={{marginTop:"6px"}}>
                            <Row>
                              <Col>
                                Start: <Moment format="lll">{treatment_plan.start}</Moment>
                              </Col>
                              <Col>
                                End: <Moment format="lll">{treatment_plan.end}</Moment>
                              </Col>
                              <Col>
                                Frequency: Every {treatment_plan.frequency} hours
                              </Col>
                            </Row>
                          </div>
                          <div>
                            <Row>
                              <Col>
                                Quantity: {treatment_plan.quantity}
                              </Col>
                              <Col>
                                Unit: {treatment_plan.unit}
                              </Col>
                              <Col>
                                Route: {treatment_plan.route}
                              </Col>
                            </Row>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                </Link>
              </Row>
            ))}
            {data.treatment_plans.length < 1 ? <p>No treatments have been created for this request.</p> : ""}
          </Card.Body>
        </Card>
      </div>
    </div> : ""}
    {/* <History action_history={data.action_history} /> */}
    <Modal show={showModal} onHide={() => setShowModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Veterinary Request Cancelation</Modal.Title>
      </Modal.Header>
      <Modal.Body>Are you sure you want to cancel this Veterinary Request and associated treatments?</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => cancelVetRequest()}>
          Yes
        </Button>
        <Button variant="secondary" onClick={() => setShowModal(false)}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default VetRequestDetails;

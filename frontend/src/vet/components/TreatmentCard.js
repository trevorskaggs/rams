import React from 'react';
import { Link } from 'raviger';
import { Card, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import Moment from 'react-moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faPlusSquare,
  faTimes,
  faCheckSquare,
  faChevronCircleDown,
  faChevronCircleRight,
  faStethoscope,
  faVial,
  faSyringe,
  faSoap,
  faEye,
  faSquare,
  faWater,
  faHeart,
  faTable,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import {
  faDiamondExclamation,
  faEyeDropper,
  faPrescriptionBottlePill,
  faSquareExclamation,
  faSquareEllipsis,
  faSquareX,
  faScalpelLineDashed,
  faFlashlight,
  faPeriod,
  faMobileScreenButton
} from '@fortawesome/pro-solid-svg-icons';
import {
  faRectangleVertical,
} from '@fortawesome/sharp-solid-svg-icons';
import { faBandage, faRing, faTankWater } from '@fortawesome/pro-regular-svg-icons';

function TreatmentCard(props) {

  return (
    <>
    <Row key={props.treatment_request.id} className="ml-0 mb-3">
      <Link href={"/" + props.organization + "/" + props.incident + "/vet/treatmentrequest/edit/" + props.treatment_request.id} className="treatment-link" style={{textDecoration:"none", color:"white"}}>
        <Card className="border rounded treatment-hover-div" style={{height:"100px", width:"745px", whiteSpace:"nowrap", overflow:"hidden"}}>
          <div className="row no-gutters hover-div treatment-hover-div" style={{height:"100px", marginRight:"-2px"}}>
            <Row className="ml-0 mr-0 w-100" style={{flexWrap:"nowrap"}}>
              <div className="border-right" style={{width:"100px"}}>
              {['Eye Medication','Ear Medication'].includes(props.treatment_request.treatment_object.category) ?
                <FontAwesomeIcon icon={faEyeDropper} size="6x" className="treatment-icon" style={{marginTop:"5px", marginLeft:"4px"}} transform={'shrink-2'} inverse />
                : props.treatment_request.treatment_object.category === 'Patient Care' ?
                <FontAwesomeIcon icon={faHeart} size="6x" className="treatment-icon" style={{marginTop:"5px", marginLeft:"4px"}} transform={'shrink-2'} inverse />
                : props.treatment_request.treatment_object.unit === 'ml' ?
                <FontAwesomeIcon icon={faSyringe} size="6x" className="treatment-icon" style={{marginTop:"5px", marginLeft:"4px"}} transform={'shrink-2'} inverse />
              :
                <FontAwesomeIcon icon={faPrescriptionBottlePill} size="6x" className="treatment-icon" style={{marginTop:"5px", marginLeft:"-1px"}} transform={'shrink-2'} inverse />
              }
              </div>
              <Col style={{marginLeft:"-5px", marginRight:"-25px"}} className="hover-div">
                <div className="border treatment-hover-div" style={{paddingTop:"5px", paddingBottom:"7px", paddingLeft:"10px", marginLeft:"-11px", marginTop: "-1px", fontSize:"18px", width:"100%", backgroundColor:"rgb(158 153 153)"}}>
                  {props.treatment_request.treatment_object.description}
                  <span className="float-right">
                  {props.treatment_request.actual_admin_time ?
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
                    : props.treatment_request.not_administered ?
                    <OverlayTrigger
                      key={"not-administered-treatment-request"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-not-administered-treatment-request`}>
                          Treatment request was not administered.
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faSquareX} size="3x" className="ml-1 treatment-icon" style={{marginTop:"-13px", marginRight:"-3px"}} transform={'shrink-2'} inverse />
                    </OverlayTrigger>
                    : new Date(props.treatment_request.suggested_admin_time) <= new Date() ?
                    <OverlayTrigger
                      key={"awaiting-action-treatment-request"}
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-awaiting-action-treatment-request`}>
                          Treatment request is pending action.
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
                <Row style={{marginTop:"6px"}}>
                  {props.treatment_request.actual_admin_time ?
                  <Col xs={6}>
                    Administered: <Moment format="lll">{props.treatment_request.actual_admin_time}</Moment>
                  </Col>
                  :
                  <Col xs={6}>
                    Scheduled: <Moment format="lll">{props.treatment_request.suggested_admin_time}</Moment>
                  </Col>
                  }
                  {props.treatment_request.assignee_object ?
                  <Col xs={4}>
                    Administrator: {props.treatment_request.assignee_object.first_name} {props.treatment_request.assignee_object.last_name}
                  </Col>
                  :
                  props.treatment_request.not_administered ?
                  <Col xs={6}>
                    Administrator: Not Administered
                  </Col> : ""}
                </Row>
                <Row>
                  <Col xs={3}>
                    Quantity: {props.treatment_request.quantity}
                  </Col>
                  <Col xs={3}>
                    Unit: {props.treatment_request.unit || '-'}
                  </Col>
                  <Col>
                    Route: {props.treatment_request.route || '-'}
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>
        </Card>
      </Link>
    </Row>
  </>
  )
}

export default TreatmentCard;

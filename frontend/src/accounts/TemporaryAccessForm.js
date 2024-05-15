import React, { useContext, useEffect, useState } from 'react';
import axios from "axios";
import { Link, navigate } from "raviger";
import { Field, Form, Formik, } from 'formik';
import { Switch } from 'formik-material-ui';
import {
  Button,
  ButtonGroup,
  Card,
  Col,
  Form as BootstrapForm,
  ListGroup,
  Modal,
  OverlayTrigger,
  Row,
  Tooltip,
} from 'react-bootstrap';
import {
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
} from '@fortawesome/pro-regular-svg-icons';
import * as Yup from 'yup';
import { DateTimePicker, DropDown, TextInput } from '../components/Form';
import Moment from 'react-moment';
import { SystemErrorContext } from '../components/SystemError';
import { AuthContext } from "./AccountsReducer";
import Header from '../components/Header';
import { createQrCode } from '../utils/qrCode';

const TemporaryAccessForm = ({ organization }) => {

  const { setShowSystemError } = useContext(SystemErrorContext);
  const { state } = useContext(AuthContext);

  const [showModal, setShowModal] = useState('');
  const [showCancelModal, setShowCancelModal] = useState('');

  const [data, setData] = useState({
    organization: state.organization.id,
    link_expires_at: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0],
    link_expires_at_options: 7,
    access_expires_at: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0],
    access_expires_at_options: 7,
  })

  const [accessData, setAccessData] = useState([]);

  const cancelTempAccess = (id) => {
    axios.delete('/incident/api/tempaccess/' + id + '/')
    setAccessData(accessData.filter(access => (access.id !== id)));
    setShowCancelModal('')
  }

  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();
    if (state.user.user_perms) {
      const fetchTempAccess = async () => {
        // Fetch Temporary Access data.
        await axios.get('/incident/api/tempaccess/', {
          cancelToken: source.token,
        })
        .then(response => {
          if (!unmounted) {
            setAccessData(response.data);
          }
        })
        .catch(error => {
          if (!unmounted) {
            setShowSystemError(true);
          }
        });
      };
      fetchTempAccess();
    }
    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, []);

  return (
    <>
      {state.user.user_perms ? <span>
      <Header>
        <Link href={"/" + organization} style={{textDecoration:"none", color:"white"}}>{state.organization.name}</Link> - Temporary Access Management
      </Header>
      <hr/>
      <Formik
        initialValues={data}
        enableReinitialize={true}
        validationSchema={Yup.object({
          access_expires_at: Yup.date(),
          link_expires_at: Yup.date(),
        })}
        onSubmit={(values, { setSubmitting }) => {
          setTimeout(() => {
            axios.post('/incident/api/tempaccess/', values)
              .then(response => {
                setAccessData([...accessData, response.data])
              })
              .catch(error => {
                setShowSystemError(true);
              });
            setSubmitting(false);
          }, 500);
        }}
      >
      {formikProps => (
        <Card border="secondary" className="mt-1" style={{width:"35%", maxWidth:"35%"}}>
          <Card.Body>
            <Form>
              <BootstrapForm.Row className="mb-3">
                <Col xs="12">
                  <Row>
                    <Col xs="4">
                    <DropDown
                      label="Access Expires In"
                      id="access_expires_at_options"
                      name="access_expires_at_options"
                      type="text"
                      options={[{value:0, label:'Never'}, {value:1, label:'1 day'}, {value:3, label:'3 days'}, {value:5, label:'5 days'}, {value:7, label:'7 days'}, {value:14, label:'14 days'}, {value:30, label:'30 days'}]}
                      onChange={(instance) => {
                        if (instance.value > 0) {
                          var access_date = new Date(new Date().setDate(new Date().getDate() + (instance.value - 1))).toISOString().split('T')[0];
                          formikProps.setFieldValue("access_expires_at", access_date)
                        }
                        else {
                          formikProps.setFieldValue("access_expires_at", null)
                        }
                        formikProps.setFieldValue("access_expires_at_options", instance.value)
                      }}
                      isClearable={false}
                    />
                    </Col>
                    <Col className="ml-0 pl-0" style={{fontSize:"24px", marginTop:"37px"}}>on <Moment format="LL">{formikProps.values.access_expires_at}</Moment></Col>
                  </Row>
                </Col>
              </BootstrapForm.Row>
              <BootstrapForm.Row>
                <Col xs="12">
                  <Row>
                    <Col xs="4">
                      <DropDown
                        label="Link Expires In"
                        id="link_expires_at_options"
                        name="link_expires_at_options"
                        type="text"
                        options={[{value:1, label:'1 day'}, {value:3, label:'3 days'}, {value:7, label:'7 days'}]}
                        onChange={(instance) => {
                          if (instance.value > 0) {
                            var access_date = new Date(new Date().setDate(new Date().getDate() + (instance.value - 1))).toISOString().split('T')[0];
                            formikProps.setFieldValue("link_expires_at", access_date)
                          }
                          else {
                            formikProps.setFieldValue("link_expires_at", null)
                          }
                          formikProps.setFieldValue("link_expires_at_options", instance.value)
                        }}
                        isClearable={false}
                      />
                    </Col>
                    <Col className="ml-0 pl-0" style={{fontSize:"24px", marginTop:"37px"}}>on <Moment format="LL">{formikProps.values.link_expires_at}</Moment></Col>
                  </Row>
                </Col>
              </BootstrapForm.Row>
            </Form>
          </Card.Body>
          <ButtonGroup>
            <Button
              type="button"
              className="btn btn-primary"
              onClick={() => { formikProps.submitForm() }}
              data-testid="save_button"
            >
              Save
            </Button>
          </ButtonGroup>
        </Card>
      )}
    </Formik>
    {accessData.map(current_data => (
      <div className="row mt-3">
        <div className="col-8 d-flex">
          <Card className="border rounded d-flex" style={{width:"100%"}}>
            <Card.Body>
              <ListGroup variant="flush" style={{marginTop:"-13px", marginBottom:"-13px"}}>
                <ListGroup.Item>
                  <span>
                    <b>URL: </b>{window.location.protocol + '//' + window.location.host + "/" + organization + "/signup/" + current_data.id.replaceAll('-','')}
                    <OverlayTrigger
                      key={"view-qrcode"}
                      placement="bottom"
                      overlay={
                        <Tooltip id={`tooltip-view-qrcode`}>
                          View QRcode
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faQrcode} className="ml-2" onClick={() => {setShowModal(window.location.protocol + '//' + window.location.host + "/" + organization + "/signup/" + current_data.id.replaceAll('-',''));}} style={{cursor:'pointer'}} inverse />
                    </OverlayTrigger>
                    <OverlayTrigger
                      key={"cancel-temp-access"}
                      placement="bottom"
                      overlay={
                        <Tooltip id={`tooltip-cancel-temp-access`}>
                          Cancel temporary access registration
                        </Tooltip>
                      }
                    >
                      <FontAwesomeIcon icon={faTimes} className="float-right" size="lg" onClick={() => {setShowCancelModal(current_data.id);}} style={{cursor:'pointer'}} inverse />
                    </OverlayTrigger>
                  </span>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>
                      <span><b>Access Expires On: </b><Moment format="LL">{current_data.access_expires_at}</Moment></span>
                    </Col>
                    <Col>
                      <span><b>Link Expires On: </b><Moment format="LL">{current_data.link_expires_at}</Moment></span>
                    </Col>
                  </Row>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </div>
      </div>
    ))}
    <Modal show={showModal} onHide={() => setShowModal('')}>
      <Modal.Header closeButton>
        <Modal.Title>{state.organization.name} Access Link</Modal.Title>
      </Modal.Header>
      <Modal.Body><img src={createQrCode(showModal)} /></Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowModal('')}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal show={showCancelModal} onHide={() => setShowCancelModal('')}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Temporary Access Cancelation</Modal.Title>
      </Modal.Header>
      <Modal.Body>Are you sure you want to cancel this Temporary Access link?</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => cancelTempAccess(showCancelModal)}>
          Yes
        </Button>
        <Button variant="secondary" onClick={() => setShowCancelModal('')}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
    </span> : ""}
    </>
  );
};

export default TemporaryAccessForm;

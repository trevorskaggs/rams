import React, { useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link, navigate } from 'raviger';
import { ButtonGroup, Card, Col, Form as BootstrapForm, ListGroup, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Switch } from 'formik-material-ui';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList, faArrowAltCircleLeft, faCommentDots, faBan, faMedkit
} from '@fortawesome/free-solid-svg-icons';
import { DropDown, TextInput } from '../components/Form';
import { faBadgeSheriff, faClawMarks } from '@fortawesome/pro-solid-svg-icons';
import Header from '../components/Header';
import ButtonSpinner from '../components/ButtonSpinner';
import { SystemErrorContext } from '../components/SystemError';
import { statusLabelLookup } from "../utils/formatString";

const customStyles = {
  // For the select it self, not the options of the select
  control: (styles, { isDisabled}) => {
    return {
      ...styles,
      color: '#FFF',
      cursor: isDisabled ? 'not-allowed' : 'default',
      backgroundColor: isDisabled ? '#DFDDDD' : 'white',
      height: 35,
      minHeight: 35
    }
  },
  option: provided => ({
    ...provided,
    color: 'black'
  }),
  // singleValue: (styles, { isDisabled }) => ({
  //   ...styles,
  //   color: isDisabled ? '#595959' : 'black'
  // }),
};

function AnimalStatus(props) {

  const { setShowSystemError } = useContext(SystemErrorContext);

  const [presentingComplaintChoices, setPresentingComplaintChoices] = useState([]);

  const roomRef = useRef(null);
  const shelterRef = useRef(null);

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchPresentingComplaints = async () => {
      // Fetch assignee data.
      await axios.get('/vet/api/complaints/', {
        cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          let options = [];
          response.data.forEach(function(complaint) {
            options.push({value: complaint.id, label: complaint.name})
          });
          setPresentingComplaintChoices(options);
        }
      })
      .catch(error => {
        setShowSystemError(true);
      });
    };
    fetchPresentingComplaints();

    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, []);

  return (
    <>
    <Row>
      <Col xs={4} className="pl-0" style={{marginLeft:"-5px"}}>
        <DropDown
          id={`sr_updates.${props.index}.animals.${props.inception}.status`}
          name={`sr_updates.${props.index}.animals.${props.inception}.status`}
          type="text"
          className="mt-0"
          options={props.animal.status === 'SHELTERED' ? [{value:props.animal.status, label:statusLabelLookup[props.animal.status]}] : [{value:props.animal.status, label:statusLabelLookup[props.animal.status]}, {value:'SHELTERED', label:'Sheltered'}]}
          value={`sr_updates.${props.index}.animals.${props.inception}.status`}
          key={`sr_updates.${props.index}.animals.${props.inception}.status`}
          isClearable={false}
          onChange={(instance) => {
            props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.status`, instance === null ? '' : instance.value);
            if (instance.value === 'SHELTERED') {
              props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.shelter`, Number(props.shelter_id));
              props.formikProps.setFieldValue('animals', [...props.formikProps.values['animals'], props.animal.id]);
            }
            else {
              props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.shelter`, '');
              props.formikProps.setFieldValue('animals', props.formikProps.values['animals'].filter(id => id !== props.animal.id))
              if (shelterRef.current) shelterRef.current.select.clearValue();
            }
          }}
        />
      </Col>
      <span style={{ marginTop:"-3px", marginBottom: "-4px", fontSize: "26px", textTransform:"capitalize" }}>
        A#{props.animal.id_for_incident} - {props.animal.name || "Unknown"}&nbsp;-&nbsp;{props.animal.species}
        {props.animal.color_notes ?
        <OverlayTrigger
          key={"animal-color-notes"}
          placement="top"
          overlay={
            <Tooltip id={"tooltip-animal-color-notes"}>
              {props.animal.color_notes}
            </Tooltip>
          }
        >
          <FontAwesomeIcon icon={faClipboardList} className="ml-1" inverse />
        </OverlayTrigger>
        : ""}
        {props.animal.pcolor || props.animal.scolor ? <span className="ml-1">({props.animal.pcolor ? props.animal.pcolor : "" }{props.animal.scolor ? <span>{props.animal.pcolor ? <span>/</span> : ""}{props.animal.scolor}</span> : ""})</span>: ""}
        {props.animal.animal_notes ? (
          <>
            <OverlayTrigger
              key={"animal-notes"}
              placement="top"
              overlay={
                <Tooltip id={"tooltip-animal-notes"}>
                  {props.animal.animal_notes}
                </Tooltip>
              }
            >
              <FontAwesomeIcon icon={faCommentDots} className="ml-1 fa-flip-horizontal" inverse />
            </OverlayTrigger>
          </>
        ) : ""}
        {props.animal.aggressive === 'yes' ? (
          <OverlayTrigger
            key={"aggressive"}
            placement="top"
            overlay={
              <Tooltip id={`tooltip-aggressive`}>
                Animal is aggressive
              </Tooltip>
            }
          >
            <FontAwesomeIcon icon={faClawMarks} size="sm" className="ml-1" />
          </OverlayTrigger>
        ) : props.animal.aggressive === 'no' ? (
          <OverlayTrigger
            key={"not-aggressive"}
            placement="top"
            overlay={
              <Tooltip id={`tooltip-aggressive`}>
                Animal is not aggressive
              </Tooltip>
            }
          >
            <span className="fa-layers" style={{marginLeft:"2px"}}>
              <FontAwesomeIcon icon={faClawMarks} size="sm" />
              <FontAwesomeIcon icon={faBan} color="#ef5151" size="sm" transform={'shrink-2'} />
            </span>
          </OverlayTrigger>
        ) : ""}
        {props.animal.aco_required === 'yes' ? (
          <OverlayTrigger
            key={"aco-required"}
            placement="top"
            overlay={
              <Tooltip id={`tooltip-aco-required`}>
                ACO required
              </Tooltip>
            }
          >
            <FontAwesomeIcon icon={faBadgeSheriff} size="sm" className="ml-1" />
          </OverlayTrigger>
        ) : ""}
        {props.animal.injured === 'yes' ? (
          <OverlayTrigger
            key={"injured"}
            placement="top"
            overlay={
              <Tooltip id={`tooltip-injured`}>
                Animal is injured
              </Tooltip>
            }
          >
            <FontAwesomeIcon icon={faMedkit} size="sm" className="ml-1 fa-move-up" />
          </OverlayTrigger>
        ) : props.animal.injured === 'no' ? (
          <OverlayTrigger
            key={"not-injured"}
            placement="top"
            overlay={
              <Tooltip id={`tooltip-injured`}>
                Animal is not injured
              </Tooltip>
            }
          >
            <span className="fa-layers" style={{marginLeft:"2px"}}>
              <FontAwesomeIcon icon={faMedkit} size="sm" className="fa-move-up" />
              <FontAwesomeIcon icon={faBan} color="#ef5151" size="sm" transform={'shrink-2'} />
            </span>
          </OverlayTrigger>
        ) : ""}
      </span>
    </Row>
    {props.formikProps.values && props.formikProps.values.sr_updates[props.index] && props.formikProps.values.sr_updates[props.index].animals[props.inception] && props.formikProps.values.sr_updates[props.index].animals[props.inception].status === 'SHELTERED' ?
    <Row>
      <Col xs={4} className="pl-0" style={{marginLeft:"-5px"}}>
        <DropDown
          id={`sr_updates.${props.index}.animals.${props.inception}.shelter`}
          name={`sr_updates.${props.index}.animals.${props.inception}.shelter`}
          type="text"
          ref={shelterRef}
          className="mt-3"
          options={props.shelter_options}
          value={`sr_updates.${props.index}.animals.${props.inception}.shelter`}
          isClearable={false}
          placeholder="Select Shelter..."
          onChange={(instance) => {
            props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.room`, '');
            props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.shelter`, instance === null ? '' : instance.value);
            roomRef.current.select.clearValue();
          }}
        />
      </Col>
      <Col xs={6} className="pl-0">
        <DropDown
          id={`sr_updates.${props.index}.animals.${props.inception}.room`}
          name={`sr_updates.${props.index}.animals.${props.inception}.room`}
          type="text"
          ref={roomRef}
          className="mt-3"
          options={props.room_options[props.formikProps.values.sr_updates[props.index].animals[props.inception].shelter] ? props.room_options[props.formikProps.values.sr_updates[props.index].animals[props.inception].shelter] : []}
          isClearable={true}
          placeholder="Select Room..."
          value={`sr_updates.${props.index}.animals.${props.inception}.room`}
          onChange={(instance) => {
            props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.room`, instance === null ? '' : instance.value);
          }}
        />
      </Col>
    </Row>
    : ""}
    {props.formikProps.values && props.formikProps.values.sr_updates[props.index] && props.formikProps.values.sr_updates[props.index].animals[props.inception] && props.formikProps.values.sr_updates[props.index].animals[props.inception].status === 'SHELTERED' ?
    <span><BootstrapForm.Row style={{marginLeft:"-15px"}}>
      <Col xs={"4"} className="mt-3 pl-0" style={{marginLeft:"-5px"}}>
        <DropDown
          label="Triage"
          id={`sr_updates.${props.index}.animals.${props.inception}.priority`}
          name={`sr_updates.${props.index}.animals.${props.inception}.priority`}
          type="text"
          options={[
            { value: 'green', label: 'Green (No Problem)' },
            { value: 'when_available', label: 'Yellow (When Available)' },
            { value: 'urgent', label: 'Red (Urgent)' },
          ]}
          value={`sr_updates.${props.index}.animals.${props.inception}.priority`}
          isClearable={false}
          onChange={(instance) => {
            props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.priority`, instance === null ? '' : instance.value);
          }}
        />
      </Col>
    </BootstrapForm.Row>
    {props.formikProps.values.sr_updates[props.index].animals[props.inception].priority !== 'green' ? <BootstrapForm.Row className="mt-3 mb-3" style={{marginLeft:"-15px"}}>
      <Col xs={"8"} className="pl-0" style={{marginLeft:"-5px"}}>
        <label>Presenting Complaints*</label>
        <Select
          id={`sr_updates.${props.index}.animals.${props.inception}.presenting_complaints`}
          name={`sr_updates.${props.index}.animals.${props.inception}.presenting_complaints`}
          type="text"
          styles={customStyles}
          isMulti
          options={presentingComplaintChoices}
          value={presentingComplaintChoices.filter(choice => props.formikProps.values.sr_updates[props.index].animals[props.inception].presenting_complaints && props.formikProps.values.sr_updates[props.index].animals[props.inception].presenting_complaints.includes(choice.value))}
          isClearable={true}
          onChange={(instance) => {
            let values = [];
            instance && instance.forEach(option => {
              values.push(option.value);
            })
            props.formikProps.setFieldValue(`sr_updates.${props.index}.animals.${props.inception}.presenting_complaints`, instance === null ? [] : values);
          }}
        />
        {props.formikProps.errors['presenting_complaints'] ? <div style={{ color: "#e74c3c", marginTop: ".5rem", fontSize: "80%" }}>{props.formikProps.errors['presenting_complaints']}</div> : ""}
      </Col>
    </BootstrapForm.Row>: ""}
    {presentingComplaintChoices.length && props.formikProps.values.sr_updates[props.index].animals[props.inception].presenting_complaints && props.formikProps.values.sr_updates[props.index].animals[props.inception].presenting_complaints.includes(presentingComplaintChoices.filter(option => option.label === 'Other')[0].value) ?
    <BootstrapForm.Row className="pl-0" style={{marginLeft:"-15px"}}>
      <TextInput
        type="text"
        label="Other Presenting Complaint"
        name={`sr_updates.${props.index}.animals.${props.inception}.complaints_other`}
        id={`sr_updates.${props.index}.animals.${props.inception}.complaints_other`}
        xs="6"
        style={{marginLeft:"-5px"}}
      />
    </BootstrapForm.Row>
    : ""}
    {props.formikProps.values.sr_updates[props.index].animals[props.inception].priority !== 'green' ? <Row className="pl-0" style={{marginLeft:"-30px"}}>
      <TextInput
        as="textarea"
        label="Concern"
        name={`sr_updates.${props.index}.animals.${props.inception}.concern`}
        id={`sr_updates.${props.index}.animals.${props.inception}.concern`}
        xs="8"
        rows={4}
        style={{marginLeft:"-5px"}}
      />
    </Row> : ""}
    {props.formikProps.values.sr_updates[props.index].animals[props.inception].priority !== 'green' ? <Row className="pl-0" style={{marginBottom:"-15px", marginLeft:"-30px"}}>
      <Col xs="2" style={{marginLeft:"-5px", marginBottom:"3px"}}>
        <BootstrapForm.Label htmlFor="caution" style={{marginBottom:"-5px"}}>Use Caution</BootstrapForm.Label>
        <div style={{marginLeft:"-3px"}}><Field component={Switch} name={`sr_updates.${props.index}.animals.${props.inception}.caution`} type="checkbox" color="primary" /></div>
      </Col>
    </Row> : ""}
    </span> : ""}
    </>
  )
}

function ShelterIntake({ id, incident, organization }) {

  const { setShowSystemError } = useContext(SystemErrorContext);

  const [options, setOptions] = useState({shelter_options:[], room_options:{}, da_options:[], fetching:true});
  const [data, setData] = useState({shelter_name:'', dispatch_assignments:[], sr_updates:[], shelter: id, da: null, animals:[], isFetching: false});
  const [selected, setSelected] = useState(null);

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchShelter = async () => {
      // Fetch current ServiceRequest data.
      await axios.get('/shelter/api/shelter/' + id + '/?incident=' + incident, {
        cancelToken: source.token,
      })
      .then(currentResponse => {
        if (!unmounted) {
          let room_options = {};
          let shelter_options = [{value: currentResponse.data.id, label: currentResponse.data.name}];
          room_options[currentResponse.data.id] = [];
          currentResponse.data.buildings.forEach(building => {
            building.rooms.forEach(room => {
              // Build room option list identified by shelter ID.
              room_options[currentResponse.data.id].push({value: room.id, label: room.building_name + ' - ' + room.name + ' (' + room.animal_count + ' animals)'});
            });
          });
          // Fetch active DA data.
          axios.get('/evac/api/evacassignment/?incident=' + incident, {
            params: {
              status: 'active',
              map: true
            },
            cancelToken: source.token,
          })
          .then(response => {
            if (!unmounted) {
              let da_options = [];
              response.data.forEach((da, index) => {
                da_options.push({value: da.id, label: "DA#" + da.id_for_incident + " | " + da.team_name + ": " + da.team_object.display_name});
                response.data[index]["sr_updates"] = [];
                da.assigned_requests.forEach((assigned_request, inception) => {
                  response.data[index].sr_updates.push({
                    id: assigned_request.service_request_object.id,
                    animals: Object.keys(assigned_request.animals).map(animal_id => {return {
                      ...assigned_request.animals[animal_id],
                      id:animal_id,
                      id_for_incident:assigned_request.animals[animal_id].id_for_incident,
                      request:assigned_request.service_request_object.id,
                      shelter:assigned_request.animals[animal_id].shelter || '',
                      room:assigned_request.animals[animal_id].room || '',
                      priority:'green'
                    }}),
                  });
                });
              });
              setData(prevState => ({ ...prevState, shelter_name: currentResponse.data.name, dispatch_assignments: response.data, sr_updates: [], isFetching: false}));
              setOptions({shelter_options:shelter_options, room_options: room_options, da_options:da_options, fetching:false});
            }
          })
          .catch(error => {
            if (!unmounted) {
              setData(prevState => ({ ...prevState, shelter_name: '', dispatch_assignments: [], sr_updates: [], isFetching: false}));
              setShowSystemError(true);
            }
          });
        }
      })
    };

    fetchShelter();
    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, [id, incident]);

  return (
    <Formik
      initialValues={data}
      enableReinitialize={true}
      validationSchema={Yup.object({
        sr_updates: Yup.array().of(
          Yup.object().shape({
            id: Yup.number().required(),
            animals: Yup.array().of(
              Yup.object().shape({
                id: Yup.number().required(),
                status: Yup.string(),
                shelter: Yup.number().nullable(),
                room: Yup.number().nullable(),
              })
            ),
          })
        ),
      })}
      onSubmit={(values, { setSubmitting }) => {
        axios.patch('/evac/api/evacassignment/' + selected + '/?shelter=' + id, values)
        .then(DAresponse => {
          values['intake_type'] = 'dispatch';
          axios.post('/shelter/api/intakesummary/', values)
          .then(response => {
            navigate('/' + organization + "/" + incident + "/shelter/intakesummary/" + response.data.id);
          })
          .catch(error => {
            setSubmitting(false);
            setShowSystemError(true);
          });
          })
        .catch(error => {
          setSubmitting(false);
          setShowSystemError(true);
        });
      }}
    >
      {props => (
        <BootstrapForm as={Form}>
          <Header>
            <span style={{cursor:'pointer'}} onClick={() => navigate('/' + organization + "/" + incident + "/shelter/" + id)} className="mr-2"><FontAwesomeIcon icon={faArrowAltCircleLeft} size="sm" inverse /></span>
            {data.shelter_name}
            &nbsp;- Dispatch Intake
          </Header>
          <hr/>
          <Row>
            <Col xs={12}>
              <DropDown
                id={"da_select"}
                name={"da_select"}
                type="text"
                size="lg"
                options={options.da_options}
                isClearable={false}
                placeholder={options.fetching ? "Loading..." : "Select Dispatch..."}
                onChange={(instance) => {
                  instance.value ? setSelected(instance.value) : setSelected(null);
                  props.setFieldValue("da", instance.value ? instance.value : null);
                  props.setFieldValue("animals", []);
                  let selected_da = data.dispatch_assignments.filter(da => da.id === instance.value)[0];
                  setData(prevState => ({ ...prevState, "sr_updates":selected_da.sr_updates, "da":instance.value }));
                }}
                disabled={options.fetching ? true : false}
              />
            </Col>
          </Row>
          {selected ?
          <Row>
            {data.dispatch_assignments.filter(da => da.id === selected)[0].assigned_requests.map((assigned_request, index) => (
            <Col xs={12} key={assigned_request.service_request_object.id} className="pl-0" >
              <Card className="mt-3 ml-3 border rounded">
                <Card.Body>
                  <Card.Title style={{marginBottom:"-5px", marginTop:"-5px"}}>
                    <h4>
                      SR#{assigned_request.service_request_object.id_for_incident} -&nbsp;
                      <Link href={"/" + organization + "/" + incident + "/hotline/servicerequest/" + assigned_request.service_request_object.id_for_incident} className="text-link" style={{textDecoration:"none", color:"white"}}>{assigned_request.service_request_object.full_address}</Link>
                    </h4>
                  </Card.Title>
                  <hr />
                  <ListGroup variant="flush" style={{ marginTop: "-13px", marginBottom: "-13px" }}>
                    <h4 className="mt-2" style={{ marginBottom: "-2px" }}>Animals</h4>
                    {data.sr_updates[index] && data.sr_updates[index].animals.map((animal, inception) => (
                      <ListGroup.Item key={animal.id} hidden={animal.status === 'SHELTERED' && data.sr_updates[index] && data.sr_updates[index].animals[inception] && (data.sr_updates[index].animals[inception].shelter !== Number(id))}>
                        <AnimalStatus formikProps={props} index={index} inception={inception} shelter_id={id} animal={animal} shelter_options={options.shelter_options} room_options={options.room_options} />
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
            ))}
          </Row> : ""}
          {selected ?
          <ButtonGroup size="lg" className="col-12 pl-0 pr-0 mt-3 mb-3">
            <ButtonSpinner isSubmitting={props.isSubmitting} isSubmittingText="Saving..." className="btn btn-block border" type="submit">
              Save
            </ButtonSpinner>
          </ButtonGroup> : ""}
        </BootstrapForm>
      )}
    </Formik>
  )
}

export default ShelterIntake

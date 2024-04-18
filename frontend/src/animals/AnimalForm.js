import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { navigate, useNavigationPrompt, useQueryParams } from 'raviger';
import { Form, Formik } from "formik";
import { ButtonGroup, Card, Col, Image, Form as BootstrapForm } from "react-bootstrap";
import * as Yup from 'yup';
import { AddressSearch, DateTimePicker, DropDown, FileUploader, ImageUploader, TextInput } from '../components/Form.js';
import { catAgeChoices, dogAgeChoices, horseAgeChoices, otherAgeChoices, catColorChoices, dogColorChoices, horseColorChoices, otherColorChoices, sexChoices, dogSizeChoices, catSizeChoices, horseSizeChoices, otherSizeChoices, reportedStatusChoices, unknownChoices, otherAgeChoice } from './constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowAltCircleLeft, faMinusSquare, faTimes } from '@fortawesome/free-solid-svg-icons';
import ButtonSpinner from "../components/ButtonSpinner";
import { AuthContext } from "../accounts/AccountsReducer";
import { SystemErrorContext } from '../components/SystemError';
import CustomSelect from "../components/CustomSelect.js";

const AnimalForm = (props) => {

  const { dispatch, state } = useContext(AuthContext);
  const { setShowSystemError } = useContext(SystemErrorContext);

  const id = props.id;
  const incident = '/' + props.incident;

  // Determine if this is an intake workflow.
  let is_intake = window.location.pathname.includes("intake");
  let is_reporter = window.location.pathname.includes("reporter");

  // Determine if we're in a multi-step workflow.
  let is_workflow = window.location.pathname.includes("workflow");

  const [redirectCheck, setRedirectCheck] = useState(is_workflow);
  useNavigationPrompt(redirectCheck, "Are you sure you would like to leave the animal intake workflow? No data will be saved.");
  
  // is submitting state for save/next workflow buttons
  const [isButtonSubmitting, setIsButtonSubmitting] = useState(false);

  // Identify any query param data.
  const [queryParams] = useQueryParams();
  const {
    owner_id = null,
    servicerequest_id = null,
    reporter_id = null,
    shelter_id = null,
  } = queryParams;

  // Track species selected and update choice lists accordingly.
  const speciesRef = useRef(null);
  const sexRef = useRef(null);
  const sizeRef = useRef(null);
  const ageTextRef = useRef();
  const pcolorRef = useRef(null);
  const scolorRef = useRef(null);
  const roomRef = useRef(null);
  const shelterRef = useRef(null);
  const ageChoices = {'':[], 'dog':dogAgeChoices, 'cat':catAgeChoices, 'horse':horseAgeChoices, 'other':otherAgeChoices}
  const colorChoices = {'':[], 'dog':dogColorChoices, 'cat':catColorChoices, 'horse':horseColorChoices, 'other':otherColorChoices}
  const sizeChoices = {'':[], 'dog':dogSizeChoices, 'cat':catSizeChoices, 'horse':horseSizeChoices, 'other':otherSizeChoices}

  // Track whether or not to add another animal after saving.
  const [addAnother, setAddAnother] = useState(false);

  // Dynamic placeholder value for options.
  const [placeholder, setPlaceholder] = useState("Select a species...");

  const initialData = {
    new_owner: owner_id,
    reporter: reporter_id,
    request: servicerequest_id,
    status: 'REPORTED',
    name: '',
    species: '',
    sex: '',
    size: '',
    age: '',
    pcolor: '',
    scolor: '',
    color_notes: '',
    fixed: 'unknown',
    aco_required: 'unknown',
    aggressive: 'unknown',
    confined: 'unknown',
    injured: 'unknown',
    behavior_notes: '',
    medical_notes: '',
    last_seen: null,
    microchip: '',
    number_of_animals: 1,
    room: null,
    shelter: props.state.shelter || null,
    front_image: null,
    front_image_data_url: '',
    side_image: null,
    side_image_data_url: '',
    extra_images: [],
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    latitude: null,
    longitude: null,
    incident_slug: props.incident,
  }
  let current_data = {...initialData};
  let imageList = [];
  if (is_workflow && props.state.steps.animals[props.state.animalIndex]) {
    for (let pair of props.state.steps.animals[props.state.animalIndex].entries()) {
      current_data[String(pair[0])] = pair[1];
      if (['front_image', 'side_image'].includes(pair[0])) {
        current_data[String(pair[0])] = null;
        imageList.push({data_url:props.state.steps.animals[props.state.animalIndex].get(pair[0] + '_data_url'), file:pair[1]})
      }
    }
  }

  const [front_image, setFrontImage] = useState(imageList);
  const [side_image, setSideImage] = useState([]);
  const [extra_images, setExtraImages] = useState([]);
  const [reinitialize, setReinitialize] = useState(true);

  // Reset form with existing data when hitting back.
  const populateBack = (formdata) => {
    let current_data = {...initialData};
    for (let pair of formdata.entries()) {
      if (['front_image', 'side_image'].includes(pair[0])) {
        current_data[String(pair[0])] = null;
        const imageList = [];
        imageList.push({data_url:formdata.get(pair[0] + '_data_url'), file:pair[1]});
        if (pair[0] === 'front_image') {
          setFrontImage(imageList);
        }
        else {
          setSideImage(imageList);
        }
      }
      else if (['room', 'shelter'].includes(pair[0])) {
        current_data[String(pair[0])] = Number(pair[1]);
      }
      else {
        current_data[String(pair[0])] = pair[1];
      }
    }
    setData(current_data);
  }

  // Initial Animal data.
  const [data, setData] = useState(current_data);
  const [shelters, setShelters] = useState({options: [], shelters: [], room_options: {}, isFetching: false});
  const [species, setSpecies] = useState({options: []});

  const wrapperSetFrontImage = useCallback(val => {
    if (val !== 0){
      setFrontImage(val);
    }
  }, [setFrontImage]);

  const wrapperSetSideImage = useCallback(val => {
    if (val !== 0){
      setSideImage(val);
    }
  }, [setSideImage]);

  const wrapperSetExtraImages = useCallback(val => {
    if (val !== 0){
      setExtraImages(val);
    }
  }, [setExtraImages]);

  // Resets single file image fields to be null.
  const clearImage = (image_name, setFieldValue) => {
    setData(prevState => ({ ...prevState, [image_name]:null }));
    setFieldValue(image_name, null);
  }

  // Removes an image from a multi file image field array.
  const clearImages = (image_url, setFieldValue) => {
    setData(prevState => ({ ...prevState, "extra_images":data.extra_images.filter(url => url !== image_url) }));
    setFieldValue("extra_images", data.extra_images.filter(url => url !== image_url));
  }

  // Hook for initializing data.
  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();

    const fetchSpecies = () => {
      setSpecies({options: []});
      // Fetch Species data.
      axios.get('/animals/api/species/', {
        cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          let species_options = [];
          response.data.forEach(result => {
            // Build species option list.
            species_options.push({value: result.id, label: result.name});
          });
          setSpecies({options: species_options});
        }
      })
      .catch(error => {
        if (!unmounted) {
          setSpecies({options: []});
          setShowSystemError(true);
        }
      });
    };
    fetchSpecies();

    if (id) {
      const fetchAnimalData = async () => {
        // Fetch Animal data.
        await axios.get('/animals/api/animal/' + id + '/', {
          cancelToken: source.token,
        })
        .then(response => {
          if (!unmounted) {
            // Initialize number_of_animals because it's not returned by the serializer.
            response.data['number_of_animals'] = 1;
            setData(response.data);
            setPlaceholder("Select...");
            // Turn off reinitialization after form load so that data can be modified for image tracking without causing a form reset.
            setReinitialize(false);
          }
        })
        .catch(error => {
          if (!unmounted) {
            setShowSystemError(true);
          }
        });
      };
      fetchAnimalData();
    }

    const fetchShelters = () => {
      setShelters({options: [], shelters: [], room_options: {}, isFetching: true});
      // Fetch Shelter data.
      axios.get('/shelter/api/shelter/?incident=' + props.incident + '&organization=' + props.organization +'&training=' + (state && state.incident.training), {
        cancelToken: source.token,
      })
      .then(response => {
        if (!unmounted) {
          let options = [];
          let room_options = {};
          response.data.forEach(shelter => {
            // Build shelter option list.
            options.push({value: shelter.id, label: shelter.name});
            room_options[shelter.id] = [];
            shelter.buildings.forEach(building => {
              building.rooms.forEach(room => {
                // Build room option list identified by shelter ID.
                room_options[shelter.id].push({value: room.id, label: room.building_name + ' - ' + room.name + ' (' + room.animal_count + ' animals)'});
              });
            });
          });
          setShelters({options: options, shelters:response.data, room_options:room_options, isFetching:false});
        }
      })
      .catch(error => {
        if (!unmounted) {
          setShelters({options: [], shelters: [], room_options: {}, isFetching: false});
          setShowSystemError(true);
        }
      });
    };
    fetchShelters();

    // Cleanup.
    return () => {
      unmounted = true;
      source.cancel();
    };
  }, [id, props.incident]);
  
  return (
    <>
      <Formik
        initialValues={data}
        enableReinitialize={reinitialize}
        validationSchema={Yup.object({
          status: Yup.string(),
          name: Yup.string()
            .max(50, 'Must be 50 characters or less.'),
          species: Yup.number()
            .required('Required'),
          size: Yup.string(),
          age: Yup
            .string()
            .max(10, 'Must be 10 characters or less'),
          ageText: Yup
            .string()
            .max(10, 'Must be 10 characters or less'),
          sex: Yup.string()
            .oneOf(['M', 'F']),
          number_of_animals: Yup.number().required('Required').positive('Value must be positive').integer('Value must be a whole number'),
          pcolor: Yup.string(),
          scolor: Yup.string(),
          color_notes: Yup.string()
            .max(400, 'Must be 400 characters or less'),
          fixed: Yup.string()
            .max(10, 'Must be 10 characters or less'),
          aco_required: Yup.string()
            .max(10, 'Must be 10 characters or less'),
          aggressive: Yup.string()
            .max(10, 'Must be 10 characters or less'),
          confined: Yup.string()
           .max(10, 'Must be 10 characters or less'),
          injured: Yup.string()
           .max(10, 'Must be 10 characters or less'),
          behavior_notes: Yup.string()
            .max(400, 'Must be 400 characters or less'),
          last_seen: Yup.date()
            .nullable(),
          microchip: Yup.string().max(50, 'Must be 50 characters or less.'),
          front_image: Yup.mixed(),
          side_image: Yup.mixed(),
          extra_images: Yup.array(),
          address: Yup.string(),
          city: Yup.string(),
          state: Yup.string(),
          zip_code: Yup.string()
            .max(10, 'Must be 10 characters or less'),
          latitude: Yup.number()
            .nullable(),
          longitude: Yup.number()
            .nullable()
        })}
        validate={(values) => {
          const errors = {};
          if (
            values.age === otherAgeChoice.value
            && !values.ageText?.trim()
          ) {
            errors.ageText = 'Input required'
          }
          return errors;
        }}
        onSubmit={ async (values, { resetForm }) => {
          // Remove owners from form data.
          if (values["owners"]) {
            delete values["owners"];
          }
          // handle age or ageText
          if (values.age === otherAgeChoice.value) {
            values.age = values.ageText;
          }

          // Use FormData so that image files may also be included.
          const formData = new FormData();
          // Convert json to FormData.
          for ( let key in values ) {
            if (values[key] !== null) {
              if (['front_image', 'side_image'].includes(key) && values[key].name) {
                formData.append(key, values[key], values[key].name);
              }
              else {
                formData.append(key, values[key]);
              }
            }
          }
          // Add extra images.
          for (let i = 0; i < values.extra_images.length; i++) {
            const extraKey = `extra${(i + 1)}`;
            const extraImage = values.extra_images[i];
            const extraName = extraImage.name;
            if (extraName) {
              formData.append(extraKey, extraImage, extraName);
            } else {
              formData.append(extraKey, extraImage);
            }
          }

          if (is_workflow) {
            setRedirectCheck(false);
            if (addAnother) {
              props.onSubmit('animals', formData, 'animals');
              // Reset form data with existing animal data if we have it.
              let formdata = props.state.steps.animals[props.state.animalIndex + 1];
              if (formdata) {
                let animal_json = {...initialData};
                for (let pair of formdata.entries()) {
                  if (['front_image', 'side_image'].includes(pair[0])) {
                    animal_json[String(pair[0])] = null;
                    const imageList = [];
                    imageList.push({data_url:formdata.get(pair[0] + '_data_url'), file:pair[1]});
                    if (pair[0] === 'front_image') {
                      setFrontImage(imageList);
                    }
                    else {
                      setSideImage(imageList);
                    }
                  }
                  else {
                    animal_json[String(pair[0])] = pair[1];
                  }
                }
                resetForm({values:animal_json});
                setRedirectCheck(true);
                setIsButtonSubmitting(false);
              }
              // Otherwise reset form with blank data.
              else {
                resetForm({values:initialData});
                setFrontImage([]);
                setSideImage([]);
                setRedirectCheck(true);
                setIsButtonSubmitting(false);
              }
            }
            // If we're in intake, then create objects and navigate to shelter page.
            else if (is_intake) {
              // Create Reporter
              let reporterResponse = [{data:{id:props.state.steps.reporter.id}}];
              if (props.state.steps.reporter.first_name && !props.state.steps.reporter.id) {
                reporterResponse = await Promise.all([
                  axios.post('/people/api/person/', props.state.steps.reporter)
                ])
                .catch(error => {
                  setIsButtonSubmitting(false);
                  setShowSystemError(true);
                  setRedirectCheck(true);
                });
              }
              else if (props.state.steps.reporter.first_name && props.state.steps.reporter.id) {
                reporterResponse = await Promise.all([
                  axios.put('/people/api/person/' + props.state.steps.reporter.id + '/', props.state.steps.reporter)
                ])
                .catch(error => {
                  setIsButtonSubmitting(false);
                  setShowSystemError(true);
                  setRedirectCheck(true);
                });
              }
              // Create Owner
              let ownerResponse = [{data:{id:props.state.steps.owner.id}}];
              if (props.state.steps.owner.first_name && !props.state.steps.owner.id) {
                ownerResponse = await Promise.all([
                  axios.post('/people/api/person/', props.state.steps.owner)
                ])
                .catch(error => {
                  setIsButtonSubmitting(false);
                  setShowSystemError(true);
                  setRedirectCheck(true);
                });
              }
              else if (props.state.steps.owner.first_name && props.state.steps.owner.id) {
                ownerResponse = await Promise.all([
                  axios.put('/people/api/person/' + props.state.steps.owner.id + '/', props.state.steps.owner)
                ])
                .catch(error => {
                  setIsButtonSubmitting(false);
                  setShowSystemError(true);
                  setRedirectCheck(true);
                });
              }

              // Create Intake Summary
              let intakeSummaryResponse = [{data:{id:null}}];
              values['shelter'] = shelter_id;
              values['person'] = reporterResponse[0].data.id ? reporterResponse[0].data.id : ownerResponse[0].data.id
              values['intake_type'] = (reporterResponse[0].data.id ? 'reporter' : 'owner') + '_walkin';
              intakeSummaryResponse = await Promise.all([
                axios.post('/shelter/api/intakesummary/', values)
              ])
              .catch(error => {
                setIsButtonSubmitting(false);
                setShowSystemError(true);
                setRedirectCheck(true);
              });
              
              // Create previous animals
              let promises = [];
              props.state.steps.animals.forEach(animal => {
                // Add owner and reporter to animal data.
                animal.append('reporter', reporterResponse[0].data.id);
                animal.append('new_owner', ownerResponse[0].data.id);
                animal.append('intake_summary', intakeSummaryResponse[0].data.id);
                promises.push(
                  axios.post('/animals/api/animal/', animal)
                );
              });

              Promise.all(promises).then(async () => {
                // Create current animal then navigate.
                formData.append('reporter', reporterResponse[0].data.id);
                formData.append('new_owner', ownerResponse[0].data.id);
                formData.append('intake_summary', intakeSummaryResponse[0].data.id);

                axios.post('/animals/api/animal/', formData)
                .then(animalResponse => {
                  navigate('/' + props.organization + "/" + props.incident + "/shelter/intakesummary/" + intakeSummaryResponse[0].data.id);
                })
                .catch(error => {
                  setIsButtonSubmitting(false);
                  setShowSystemError(true);
                  setRedirectCheck(true);
                });
              })
              .catch(error => {
                setIsButtonSubmitting(false);
                setShowSystemError(true);
                setRedirectCheck(true);
              });
            }
            else {
              props.onSubmit('animals', formData, 'request');
            }
          }
          else {
            if (id) {
              axios.put('/animals/api/animal/' + id + '/', formData)
              .then(function() {
                navigate('/' + props.organization + incident + '/animals/' + id);
              })
              .catch(error => {
                setIsButtonSubmitting(false);
                setShowSystemError(true);
                setRedirectCheck(true);
              });
            }
            else {
              axios.post('/animals/api/animal/', formData)
              .then(response => {
                // If adding to an SR, redirect to the SR.
                if (servicerequest_id) {
                  navigate('/' + props.organization + incident + '/hotline/servicerequest/' + servicerequest_id);
                }
                // If adding to an Owner, redirect to the owner.
                else if (owner_id) {
                  navigate('/' + props.organization + incident + '/people/owner/' + owner_id)
                }
                // Else redirect to the animal.
                else {
                  navigate('/' + props.organization + incident + '/animals/' + response.data.id);
                }
              })
              .catch(error => {
                setIsButtonSubmitting(false);
                setShowSystemError(true);
                setRedirectCheck(true);
              });
            }
          }
        }}
      >
        {formikProps => (
          <Card border="secondary" style={{marginTop:is_workflow ? "15px" : "35px"}}>
            <Card.Header as="h5" className="pl-3">{id || owner_id || reporter_id || servicerequest_id ?
              <span style={{cursor:'pointer'}} onClick={() => window.history.back()} className="mr-3"><FontAwesomeIcon icon={faArrowAltCircleLeft} size="lg" inverse /></span>
              :
              <span>{props.state.animalIndex > 0 ? <span style={{cursor:'pointer'}} onClick={() => {setAddAnother(false); populateBack(props.state.steps.animals[props.state.animalIndex-1]); props.handleBack('animals', 'animals')}} className="mr-3"><FontAwesomeIcon icon={faArrowAltCircleLeft} size="lg" inverse /></span>
              :
              <span style={{cursor:'pointer'}} onClick={() => {props.handleBack('animals', props.state.stepIndex > 1 ? 'owner' : 'reporter')}} className="mr-3"><FontAwesomeIcon icon={faArrowAltCircleLeft} size="lg" inverse /></span>}</span>}{!id ? "Animal Information" : "Update Animal"}</Card.Header>
            <Card.Body>
            <BootstrapForm as={Form}>
                <BootstrapForm.Row>
                  <TextInput
                    id="name"
                    name="name"
                    type="text"
                    label="Animal Name"
                    xs="4"
                  />
                  <Col xs="4" style={{textTransform:'capitalize'}}>
                    <DropDown
                      label="Species*"
                      id="speciesDropdown"
                      name="species"
                      type="text"
                      key={`my_unique_species_select_key__${formikProps.values.species}`}
                      ref={speciesRef}
                      options={species.options}
                      value={formikProps.values.species||data.species}
                      isClearable={false}
                      onChange={(instance) => {
                        setPlaceholder("Select...")
                        sizeRef.current.select.clearValue();
                        // ageRef.current.select.clearValue();
                        pcolorRef.current.select.clearValue();
                        scolorRef.current.select.clearValue();
                        formikProps.setFieldValue("species", instance.value);
                      }}
                    />
                  </Col>
                  <Col xs="4">
                    <DropDown
                      label="Size"
                      id="sizeDropdown"
                      name="size"
                      type="text"
                      isClearable={true}
                      key={`my_unique_size_select_key__${formikProps.values.size}`}
                      ref={sizeRef}
                      options={Object.keys(sizeChoices).includes(formikProps.values.species) ? sizeChoices[formikProps.values.species] : sizeChoices['other']}
                      value={formikProps.values.size||''}
                      placeholder={placeholder}
                    />
                  </Col>
                </BootstrapForm.Row>
                <BootstrapForm.Row>
                  <Col xs="4">
                    <DropDown
                      label="Primary Color"
                      id="pcolor"
                      name="pcolor"
                      type="text"
                      key={`my_unique_pcolor_select_key__${formikProps.values.pcolor}`}
                      ref={pcolorRef}
                      style={{marginTop:"2px"}}
                      options={Object.keys(colorChoices).includes(formikProps.values.species) ? colorChoices[formikProps.values.species] : colorChoices['other']}
                      value={formikProps.values.pcolor||''}
                      placeholder={placeholder}
                    />
                    <DropDown
                      label="Secondary Color"
                      id="scolor"
                      name="scolor"
                      type="text"
                      key={`my_unique_scolor_select_key__${formikProps.values.scolor}`}
                      ref={scolorRef}
                      style={{marginTop:"23px"}}
                      options={Object.keys(colorChoices).includes(formikProps.values.species) ? colorChoices[formikProps.values.species] : colorChoices['other']}
                      value={formikProps.values.scolor||''}
                      placeholder={placeholder}
                    />
                  </Col>
                  <TextInput
                    id="color_notes"
                    name="color_notes"
                    as="textarea"
                    rows={5}
                    label="Breed / Description"
                    xs="8"
                  />
                </BootstrapForm.Row>
                <BootstrapForm.Row className="mb-3">
                  <Col xs="3" hidden={shelter_id}>
                    <DropDown
                        label="Requested Service"
                        id="requestedServiceDropDown"
                        name="status"
                        type="text"
                        key={`my_unique_requested_service_select_key__${formikProps.values.status}`}
                        options={reportedStatusChoices}
                        disabled={['REPORTED', 'REPORTED (EVAC REQUESTED)', 'REPORTED (SIP REQUESTED)'].includes(data.status) ? false : true}
                        value={formikProps.values.status||''}
                        isClearable={false}
                    />
                  </Col>
                  <Col xs="3">
                    <DropDown
                      label="Sex"
                      id="sexDropDown"
                      name="sex"
                      type="text"
                      key={`my_unique_sex_select_key__${formikProps.values.sex}`}
                      ref={sexRef}
                      options={sexChoices}
                      value={formikProps.values.sex||''}
                    />
                  </Col>
                  <Col xs="3">
                    <CustomSelect
                      label="Age"
                      options={Object.keys(ageChoices).includes(formikProps.values.species)
                        ? ageChoices[formikProps.values.species]
                        : ageChoices['other']}
                      value={formikProps.values.age || ''}
                      handleValueChange={(value) => formikProps.setFieldValue('age', value)}
                      optionsKey={formikProps.values.species || ''}
                      formValidationName="age"
                    />
                  </Col>
                  <Col xs="3">
                    <DropDown
                      label="Fixed"
                      id="fixed"
                      name="fixed"
                      type="text"
                      options={unknownChoices}
                      value={formikProps.values.fixed||'unknown'}
                      isClearable={false}
                    />
                  </Col>
                </BootstrapForm.Row>
                <BootstrapForm.Row>
                  <Col xs="3">
                    <DropDown
                      label="Aggressive"
                      id="aggressive"
                      name="aggressive"
                      type="text"
                      options={unknownChoices}
                      value={formikProps.values.aggressive||'unknown'}
                      isClearable={false}
                      onChange={(instance) => {
                        formikProps.setFieldValue("aggressive", instance === null ? '' : instance.value);
                        formikProps.setFieldValue("aco_required", instance && instance.value === 'yes' ? 'yes' : formikProps.values.aco_required);
                      }}
                    />
                  </Col>
                  <Col xs="3">
                    <DropDown
                      label="ACO Required"
                      id="aco_required"
                      name="aco_required"
                      type="text"
                      options={unknownChoices}
                      value={formikProps.values.aco_required||'unknown'}
                      isClearable={false}
                    />
                  </Col>
                  <Col xs="3" hidden={is_intake}>
                    <DropDown
                      label="Confined"
                      id="confined"
                      name="confined"
                      type="text"
                      options={unknownChoices}
                      value={formikProps.values.confined||'unknown'}
                      isClearable={false}
                    />
                  </Col>
                  <Col xs="3">
                    <DropDown
                      label="Injured"
                      id="injured"
                      name="injured"
                      type="text"
                      options={unknownChoices}
                      value={formikProps.values.injured||'unknown'}
                      isClearable={false}
                    />
                  </Col>
                </BootstrapForm.Row>
                <BootstrapForm.Row className="mt-3">
                  <TextInput
                    label="Animal Notes"
                    id="behavior_notes"
                    name="behavior_notes"
                    as="textarea"
                    rows={5}
                    xs="12"
                  />
                </BootstrapForm.Row>
                <BootstrapForm.Row>
                  <TextInput
                    label="Medical Notes"
                    id="medical_notes"
                    name="medical_notes"
                    as="textarea"
                    rows={5}
                    xs="12"
                  />
                </BootstrapForm.Row>
                <BootstrapForm.Row className={!is_intake ? "mb-3" : ""}>
                  <DateTimePicker
                    label="Last Seen"
                    name="last_seen"
                    id="last_seen"
                    xs="6"
                    onChange={(date, dateStr) => {
                      formikProps.setFieldValue("last_seen", dateStr)
                    }}
                    value={formikProps.values.last_seen||null}
                    hidden={is_intake}
                    disabled={false}
                  />
                </BootstrapForm.Row>
                <BootstrapForm.Row className="mb-3" hidden={is_intake || id ? false : true}>
                  <TextInput
                    id="microchip"
                    name="microchip"
                    type="text"
                    label="Microchip Number"
                    xs="6"
                  />
                </BootstrapForm.Row>
                <BootstrapForm.Row hidden={id} style={{marginBottom:is_intake ? "" : "-15px"}}>
                  <TextInput
                    id="number_of_animals"
                    name="number_of_animals"
                    type="text"
                    xs="2"
                    label="No. of Copies"
                  />
                </BootstrapForm.Row>
                {/* Only show Shelter selection on intake and update. */}
                <span hidden={(!Boolean(id) && !is_intake) || data.status !== 'SHELTERED'}>
                  <BootstrapForm.Row className={is_intake ? "" : "mt-3"}>
                    <Col xs="6">
                      <DropDown
                        label="Shelter / Room"
                        id="shelter"
                        type="text"
                        name="shelter"
                        options={shelters.options}
                        isClearable={false}
                        ref={shelterRef}
                        key={`my_unique_shelter_select_key__${formikProps.values.shelter}`}
                        onChange={(instance) => {
                          roomRef.current.select.clearValue();
                          formikProps.setFieldValue("room", '');
                          formikProps.setFieldValue("shelter", instance === null ? '' : instance.value);
                        }}
                        value={formikProps.values.shelter||''}
                      />
                    </Col>
                  </BootstrapForm.Row>
                  <BootstrapForm.Row className="mt-3 mb-3">
                    <Col xs="6">
                      <DropDown
                        id="room"
                        type="text"
                        name="room"
                        ref={roomRef}
                        key={`my_unique_room_select_key__${formikProps.values.room}`}
                        options={shelters.room_options[formikProps.values.shelter] ? shelters.room_options[formikProps.values.shelter] : []}
                        isClearable={true}
                        value={formikProps.values.room||''}
                      />
                    </Col>
                  </BootstrapForm.Row>
                </span>
                <AddressSearch formikProps={formikProps} label="Search for Animal Found Location" hidden={is_intake ? !is_reporter : !Boolean(id)} incident={props.incident} error="Animal Found Location was not selected." />
                <span hidden={is_workflow && !is_intake}>
                  <p className={id || is_reporter ? "mb-0" : "mb-0 mt-3"}>Image Files</p>
                  <BootstrapForm.Row className="align-items-end">
                    {data.front_image ?
                      <span className="mt-2 ml-1 mr-3">
                        <Image width={131} src={data.front_image} alt="Animal Front" thumbnail />
                        <div className="mb-2">
                          <FontAwesomeIcon icon={faMinusSquare} inverse onClick={() => clearImage("front_image", formikProps.setFieldValue)} style={{backgroundColor:"red"}} />
                          <span className="ml-1">Front-Shot</span>
                        </div>
                      </span> :
                      <div className="mb-2 ml-1">
                        <ImageUploader
                          value={front_image}
                          id="front_image"
                          name="front_image"
                          parentStateSetter={wrapperSetFrontImage}
                          label="Front-Shot"
                          maxNumber={1}
                        />
                      </div>
                    }
                    {data.side_image ?
                      <span className="mt-2 mr-3">
                        <Image width={131} src={data.side_image} alt="Animal Side" thumbnail />
                        <div className="mb-2">
                          <FontAwesomeIcon icon={faMinusSquare} inverse onClick={() => clearImage("side_image", formikProps.setFieldValue)} style={{backgroundColor:"red"}} />
                          <span className="ml-1">Side-Shot</span>
                        </div>
                      </span> :
                      <div className="mb-2">
                        <ImageUploader
                          value={side_image}
                          id="side_image"
                          name="side_image"
                          parentStateSetter={wrapperSetSideImage}
                          label="Side-Shot"
                          maxNumber={1}
                        />
                      </div>
                    }
                    {data.extra_images.length > 0 ?
                      <span className="mt-2 d-flex flex-wrap align-items-end">
                        {data.extra_images.map(extra_image => (
                          <span key={extra_image} className="mr-3"><Image width={131} src={extra_image} alt="Animal Extra" thumbnail />
                            <div className="mb-2">
                              <FontAwesomeIcon icon={faMinusSquare} inverse onClick={() => clearImages(extra_image, formikProps.setFieldValue)} style={{backgroundColor:"red"}} />
                              <span className="ml-1">Extra</span>
                            </div>
                          </span>
                        ))}
                      </span>
                    :""}
                    <div className="mb-2" hidden={!id}>
                      <FileUploader
                        value={extra_images}
                        id="extra_images"
                        name="extra_images"
                        parentStateSetter={wrapperSetExtraImages}
                        label="Extra"
                        maxNumber={3 - data.extra_images.length}
                        multiple
                      />
                    </div>
                  </BootstrapForm.Row>
                </span>
            </BootstrapForm>
          </Card.Body>
          <ButtonGroup size="lg">
            {is_workflow ?
                <ButtonSpinner isSubmitting={formikProps.isSubmitting && addAnother} isSubmittingText="Saving..." type="button" onClick={() => {
                  setAddAnother(true);
                  setIsButtonSubmitting(true);
                  formikProps.submitForm();
                  speciesRef.current.focus()
                }}>
                  {props.state.steps.animals.length -1 > props.state.animalIndex ? "Next Animal" : "Add Another"}
                </ButtonSpinner> :
                <ButtonSpinner isSubmitting={formikProps.isSubmitting && !addAnother} isSubmittingText="Saving..." type="button" onClick={() => {
                  setAddAnother(false);
                  setIsButtonSubmitting(true);
                  formikProps.submitForm()
                }}>
                  Save
                </ButtonSpinner>
            }
            {is_workflow && !is_intake ?
                <ButtonSpinner isSubmitting={formikProps.isSubmitting && !addAnother} isSubmittingText="Loading..." type="button" className="btn btn-primary border" onClick={() => {
                  setAddAnother(false);
                  setIsButtonSubmitting(true);
                  formikProps.submitForm()
                }}>
                  Next Step
                </ButtonSpinner> : ""}
            {is_workflow && is_intake ?
                <ButtonSpinner isSubmitting={formikProps.isSubmitting && !addAnother} isSubmittingText="Saving..." type="button" className="btn btn-primary mr-1 border" onClick={() => {
                  setAddAnother(false);
                  setIsButtonSubmitting(true);
                  formikProps.submitForm()
                }}>
                  Save and Finish
                </ButtonSpinner> : ""}
          </ButtonGroup>
          </Card>
        )}
      </Formik>
    </>
  );
};

export default AnimalForm

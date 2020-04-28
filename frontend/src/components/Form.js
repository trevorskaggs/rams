import React from 'react';
import { useField } from 'formik';
import { Label, Input } from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Flatpickr from 'react-flatpickr';

const FlatpickrField = ({ label, ...props }) => {
  // useField() returns [formik.getFieldProps(), formik.getFieldMeta()]
  // which we can spread on <input> and also replace ErrorMessage entirely.
  const [field] = useField(props);
  var options = {allowInput:true, altInput: true, altFormat: "F j, Y h:i K",}
  return (
    <>
      <label className="mr-2" htmlFor={props.id || props.name}>{label}</label>
      <Flatpickr data-enable-time options={options} {...field} {...props} />
    </>
  );
};

// ...props is shorthand for "rest of the items in this array". So the 1st item is
// assigned to label and the rest are assigned to props
const TextInput = ({ label, ...props }) => {
  // useField() returns [formik.getFieldProps(), formik.getFieldMeta()]
  // which we can spread on <input> and also replace ErrorMessage entirely.
  const [field, meta] = useField(props);
  return (
    <>
      <label htmlFor={props.id || props.name}>{label}</label>
      <input className="text-input" {...field} {...props} />
      {meta.touched && meta.error ? (
        <div className="error">{meta.error}</div>
      ) : null}
    </>
  );
};

const Checkbox = ({ children, ...props }) => {
  // We need to tell useField what type of input this is
  // since React treats radios and checkboxes differently
  // than inputs/select/textarea.
  const [field, meta] = useField({ ...props, type: 'checkbox' });
  return (
    <>
      <label className="checkbox">
        <input type="checkbox" {...field} {...props} />
        {children}
      </label>
      {meta.touched && meta.error ? (
        <div className="error">{meta.error}</div>
      ) : null}
    </>
  );
};

const Select = ({ label, ...props }) => {
  const [field] = useField(props);
  return (
    <>
      <Label htmlFor={props.id || props.name}>{label}</Label>
      <Input type="select" {...field} {...props} />
    </>
  );
};

const MultiSelect = ({ label, ...props }) => {
  const [field] = useField(props);
  return (
    <>
      <Label htmlFor={props.id || props.name}>{label}</Label>
      <Input type="select" {...field} {...props} multiple={true}/>
    </>
  );
};
  
export { TextInput, Checkbox, Select, MultiSelect, FlatpickrField };

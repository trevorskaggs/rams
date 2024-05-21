import React from 'react';
import { Dropdown } from 'react-bootstrap';

const ActionsDropdown = ({
  className = '',
  children,
  id = 'actions-dropdown',
  size = 'sm',
  title = 'Actions',
  variant = 'dark'
}) => {
  return (
    <Dropdown size={size} className={className} alignRight={true}>
      <Dropdown.Toggle variant={variant} id={id}>
        {title}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {React.Children.map(children, (child, index) => (
          <Dropdown.Item key={index} as="div" className="p-0">
            {child}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ActionsDropdown;
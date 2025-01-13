import moment from 'moment';
import ShelterlyPDF from '../utils/pdf';
import { capitalize } from '../utils/formatString';
import { priorityChoices, DATE_FORMAT } from '../constants';
import { statusChoices } from '../animals/constants';
import { buildAnimalCountList } from '../animals/Utils';

const buildDispatchResolutionsDoc = (drs = []) => {
  const pdf = new ShelterlyPDF({}, {
    // adds page numbers to the footer
    addFooterHandler: ShelterlyPDF.HandlerTypes.DEFAULT,
    pageTitle: `Dispatch Assignment ${drs.length ? `#${drs[0].id_for_incident}` : ''}`,
    pageSubtitle: drs.length
      ? `Opened: ${new Date(drs[0].start_time).toLocaleDateString()}`
      : ''
  });

  drs.forEach((data, i) => {
    if (i > 0) {
      pdf.drawPageBreak();
      pdf.drawPageHeader({
        pageTitle: `Dispatch Assignment #${data.id}`,
        subtitle: `Opened: ${new Date(data.start_time).toLocaleDateString()}`
      });
    }

    // draw team section
    pdf.drawSectionHeader({ text: data.team_object.name, hRule: false, fontSize: 14 });
    pdf.drawPad(10)
    pdf.setDocumentFontSize({ size: 10 });
    pdf.drawTextList({
      labels: data.team && data.team_object.team_member_objects.map(team_member => (
        `${team_member.first_name} ${team_member.last_name} ${team_member.display_phone ? `${team_member.display_phone}` : ''}`
      )),
      labelMarginTop: -10
    });

    // reset document font size
    pdf.setDocumentFontSize();

    pdf.drawPad(10);

    // summary page
    data.assigned_requests.forEach((assigned_request) => {
      // service request priority
      const srPriority = priorityChoices.find(({ value }) => value === (assigned_request.service_request_object.priority || 2))

      // Summary page
      pdf.drawSectionHeader({
        text: `SR#${assigned_request.service_request_object.id_for_incident} - ${srPriority.label} Priority`,
        fontSize: 14
      });

      pdf.drawPad(10);

      // status
      pdf.drawWrappedText({
        text: `Status: ${assigned_request.service_request_object.status.toUpperCase()}`,
        fontSize: 10
      });

      // summary address
      pdf.drawSectionHeader({ text: 'Service Request Address:', fontSize: 14 });
      pdf.drawPad(10);

      const [addressLine1, ...addressLine2] = assigned_request.service_request_object.full_address.split(',');

      pdf.setDocumentFontSize({ size: 10 });

      pdf.drawTextList({
        labels: [
          addressLine1,
          addressLine2.join(',')?.trim?.()
        ],
        bottomPadding: 12,
        labelMarginTop: -10
      })

      // reset document font size
      pdf.setDocumentFontSize();

      // lat/lng
      pdf.drawWrappedText({
        text: `Latitude: ${assigned_request.service_request_object.latitude},  Longitude: ${assigned_request.service_request_object.longitude}`,
        fontSize: 10
      });

      // Animal count
      pdf.drawSectionHeader({ text: 'Animals', fontSize: 14 });

      pdf.setDocumentFontSize({ size: 12 });
      buildAnimalCountList(pdf, Object.values(assigned_request.animals), { countLabelMarginTop: -12 });

      // rest document font size
      pdf.setDocumentFontSize();

      pdf.drawPad(10);
    });

    // end of summary page break
    pdf.drawPageBreak();

    // loop through SR's and page break between each one
    data.assigned_requests.forEach((assigned_request, index) => {
      if (index > 0) {
        pdf.drawPageBreak();
      }

      // SR Header
      pdf.drawSectionHeader({
        text: `SR#${assigned_request.service_request_object.id_for_incident} - ${assigned_request.service_request_object.full_address}`,
        hRule: false,
        fontSize: 14
      });
      pdf.drawPad(15);
      pdf.drawWrappedText({
        text: `Latitude: ${assigned_request.service_request_object.latitude},  Longitude: ${assigned_request.service_request_object.longitude}`
      });
      pdf.drawPad(-45);
      pdf.drawCheckboxList({
        labels: [''],
        listStyle: 'inline',
        rightAlign:true
      });
      pdf.drawPad(-10);
      pdf.drawHRule();
      pdf.drawPad(-10);
      pdf.drawCheckboxList({
        labels: ['Unable to Complete'],
        listStyle: 'inline',
      });

      // owners
      if (assigned_request.service_request_object.owners.length) {
        assigned_request.service_request_object.owner_objects.forEach((owner) => {
          pdf.drawWrappedText({
            text: `Owner: ${owner.first_name} ${owner.last_name} ${
              owner.display_phone
            } ${
              owner.display_alt_phone ? ` / ${owner.display_alt_phone}` : ""
            }`,
          });

          pdf.drawWrappedText({ text: `Comments / Alternate Contact: ${owner.comments || 'N/A'}` });
        });
      } else {
        pdf.drawWrappedText({ text: 'Owner: N/A' });
      }

      // reporter
      if (assigned_request.service_request_object.reporter_object) {
        pdf.drawWrappedText({
          text: `Reporter: ${assigned_request.service_request_object.reporter_object.first_name} ${assigned_request.service_request_object.reporter_object.last_name} ${assigned_request.service_request_object.reporter_object.agency ? '(' + assigned_request.service_request_object.reporter_object.agency + ')' : 'No'} ${assigned_request.service_request_object.reporter_object.display_phone}`
        })
      } else {
        pdf.drawWrappedText({ text: 'Reporter: N/A' });
      }

      // additional info
      pdf.drawWrappedText({
        text: `Instructions for Field Team: ${assigned_request.service_request_object.directions || 'N/A'}`
      });

      // accessible
      pdf.drawWrappedText({
        text: `Accessible: ${assigned_request.service_request_object.accessible ? 'Yes' : 'No'}`
      });

      // turn around
      pdf.drawWrappedText({
        text: `Turn Around: ${assigned_request.service_request_object.turn_around ? 'Yes' : 'No'}`
      });

      // forced entry
      pdf.drawWrappedText({
        text: `Forced Entry Permission: ${assigned_request.visit_note?.forced_entry ? 'Yes' : 'No'}`
      });

      // key at staging (key provided)
      pdf.drawWrappedText({ text: `Key at Staging: ${assigned_request.service_request_object.key_provided ? 'Yes': 'No'}`})

      // animals
      pdf.drawSectionHeader({
        text: 'Animals'
      });

      function drawAnimalHeader({
        firstLabel = 'ID - Species\nName'
      } = {}) {
        const dispatchStatusHeaders = [{
          value: '', label: firstLabel
        }].concat(statusChoices.filter((choice) => !choice.value.includes('REPORTED')));

        pdf.drawTextList({
          labels: dispatchStatusHeaders.map((choice) => {
            if (choice.label.indexOf('SIP') > -1) {
              return 'SIP';
            }
            if (choice.label.indexOf('UTL') > -1) {
              return 'UTL';
            }
            if (choice.label.indexOf('No Further Action (NFA)') > -1) {
              return 'NFA';
            }

            return choice.label;
          }),
          listStyle: 'inline',
          bottomPadding: 5
        });

        pdf.drawHRule();
      }

      pdf.setDocumentFontSize();

      Object.values(assigned_request.animals).forEach((animal) => {
        const species = animal.species_string ? animal.species_string : (animal.species || 'other');
        // if very little page is left that would cause a weird break between the header, manually page break now
        const estimatedReleaseSectionHeight = 106;
        if (pdf.remainderPageHeight <= estimatedReleaseSectionHeight) {
          pdf.drawPageBreak();
        }
        // draw the animals header in each row
        pdf.setDocumentFontSize({ size: 11 });
        if (animal.animal_count > 1) {
          drawAnimalHeader({
            firstLabel: `***A#${
              animal.id_for_incident
            }\n${animal.animal_count} ${species[0].toUpperCase()}${species.slice(1)}${((animal.animal_count === 1) && ['sheep', 'cattle'].includes(species)) ? "" : "s"}***`,
          });
        }
        else {
          drawAnimalHeader({
            firstLabel: `***A#${
              animal.id_for_incident
            } - ${species[0].toUpperCase()}${species.slice(1)}\n${
              animal.name || "Unknown"
            }***`,
          });
        }

        const animalRow = [{
          label: `\n\n${animal.status}`,
          marginTop: -7
        }].concat(Array(6).fill({
          type: 'checkbox',
          label: '',
          size: 20,
          marginTop: -7
        }));

        pdf.drawList({
          listItems: animalRow,
          listStyle: 'inline',
          bottomPadding: 5
        });

        pdf.setDocumentFontSize({ size: 10 });

        pdf.drawTextList({
          labels: [
            animal.sex ? `Sex: ${animal.sex || 'N/A'}` : '',
            animal.fixed  ? `Fixed: ${capitalize(animal.fixed)}` : '',
            animal.aco_required ? `ACO Required: ${capitalize(animal.aco_required)}` : '',
            animal.aggressive ? `Aggressive: ${capitalize(animal.aggressive)}` : '',
            animal.confined ? `Confined: ${capitalize(animal.confined)}` : '',
            animal.injured ? `Injured: ${capitalize(animal.injured)}` : '',
            animal.last_seen ? `Last Seen: ${animal.last_seen ? moment(animal.last_seen).format('MMMM Do YYYY HH:mm') : 'Unknown'}` : '',
            animal.age ? `Age: ${capitalize(animal.age) || 'N/A'}` : '',
            animal.size ? `Size: ${capitalize(animal.size) || 'N/A'}` : '',
            `Primary Color: ${capitalize(animal.pcolor) || 'N/A'}`,
            `Secondary Color: ${capitalize(animal.scolor) || 'N/A'}`
          ],
          listStyle: 'grid',
          labelMarginTop: -4
        });

        // reset document font size
        pdf.setDocumentFontSize();

        pdf.drawPad(13);

        pdf.drawWrappedText({
          text: `Description: ${animal.color_notes || 'N/A'}`,
          bottomPadding: 0,
          fontSize: 10
        });
        pdf.drawWrappedText({
          text: `Animal Notes: ${animal.behavior_notes ? animal.behavior_notes : animal.animal_notes || 'N/A'}`,
          bottomPadding: 0,
          fontSize: 10
        });
        pdf.drawWrappedText({
          text: `Medical Notes: ${animal.medical_notes || 'N/A'}`,
          fontSize: 10
        });
      });

      pdf.setDocumentFontSize();

      // priorities
      pdf.drawSectionHeader({ text: 'Priority', hRule: true });
      pdf.setDocumentFontSize({ size: 10 });
      const currentPriority = assigned_request.service_request_object.priority || 2
      pdf.drawCheckboxList({
        labels: priorityChoices.map(({ value, label}) => {
          if (value === currentPriority) {
            return `${label} (Current)`
          }
          return label
        }),
        listStyle: 'inline',
      });
      pdf.setDocumentFontSize();

      // date completed, followup, etc..
      pdf.drawTextList({
        labels: [
          'Date Completed:  ________/________/________________'
        ],
        bottomPadding: 5
      });
      pdf.drawTextList({
        labels: [
          'Followup Date:  ________/________/________________'
        ],
        bottomPadding: 26
      })

      if (assigned_request.visit_note?.notes) {
        pdf.drawWrappedText({
          text: `Visit Notes: ${
            (assigned_request.visit_note?.notes && assigned_request.visit_note?.notes) || ''
          }`
        });
        pdf.drawHRule();
      }
      else {
        pdf.drawWrappedText({
          text: `Visit Notes:`,
        });
        pdf.drawPad(-15);
        pdf.drawTextArea({ rows: 4 });
      }

      if (assigned_request.visit_notes.length > 0) {
        pdf.drawWrappedText({
          text: `Previous Visit Notes`,
          fontSize: 12
        });
        assigned_request.visit_notes.forEach((visit_note) => {
          pdf.drawWrappedText({
            text: `${moment(visit_note.date_completed).format(
              'MMMM Do'
            )}: ${(visit_note?.notes && visit_note?.notes) || 'No information available.'}`
          });
          pdf.drawHRule();
        })
      }
      pdf.drawCheckBoxLine({ label: 'Forced Entry Used' });

      // owners contacted
      if (assigned_request.service_request_object.owners.length) {
        pdf.drawTextList({
          labels: ['Owner Contacted:']
        });

        assigned_request.service_request_object.owner_objects.forEach((owner) => {
          pdf.drawCheckBoxLine({ label: `Owner: ${owner.first_name} ${owner.last_name} ${owner.display_phone}` });
          
          owner.owner_contacts?.forEach((owner_contacted) => {
            pdf.drawWrappedText({
              text: `Owner Contact Time: ${
                owner_contacted.owner_contact_time
                  ? moment(owner_contacted.owner_contact_time).format(
                      'MMMM Do YYYY HH:mm'
                    )
                  : 'UNKNOWN'
              }`,
            });
            pdf.drawWrappedText({
              text: `Owner Contact Notes: ${owner_contacted.owner_contact_note}`
            });
            pdf.drawHRule();
          });

          pdf.drawPad(10);
          pdf.drawTextWithLine({ label: 'Owner Contact Time:', xOffset: 125 });
          pdf.drawWrappedText({
            text: 'Owner Contact Notes:'
          });
          pdf.drawPad(-15);
          pdf.drawTextArea({ rows: 3 });
        });
      }
    });
  });

  return pdf;
}

function printDispatchResolutionForm(dr = {}) {
  const pdf = buildDispatchResolutionsDoc([dr]);
  pdf.fileName = `DAR-${dr.id_for_incident.toString().padStart(3, 0)}`;
  return pdf.saveFile();
}

function printAllDispatchResolutions(drs = []) {
  const pdf = buildDispatchResolutionsDoc(drs);
  pdf.fileName = `DARs-${moment().format(DATE_FORMAT)}`;
  return pdf.saveFile();
}

export {
  printDispatchResolutionForm,
  printAllDispatchResolutions
};

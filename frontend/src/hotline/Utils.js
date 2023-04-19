import moment from 'moment';
import ShelterlyPDF from '../utils/pdf';
import { priorityChoices, DATE_FORMAT } from '../constants';
import { capitalize } from '../utils/formatString';
import { buildAnimalCareScheduleDoc } from '../animals/Utils';

function buildServiceRequestsDoc(srs = []) {
  const pdf = new ShelterlyPDF({}, {
    // adds page numbers to the footer
    addFooterHandler: ShelterlyPDF.HandlerTypes.DEFAULT,
    pageTitle: 'Service Request Summary',
    pageSubtitle: ' '
  });

  srs.forEach((data, i) => {
    if (i > 0) {
      pdf.drawPageBreak();
      pdf.drawPageHeader();
    }

    // service request priority
    const srPriority = priorityChoices.find(({ value }) => value === (data.priority || 2))

    // Summary page
    pdf.drawSectionHeader({ text: `Information` });

    pdf.drawPad(20);

    // id & priority
    pdf.drawWrappedText({ text: `SR#${data.id} - ${srPriority.label} Priority` })

    // status
    pdf.drawWrappedText({ text: `Status: ${data.status.toUpperCase()}` });

    // summary address
    pdf.drawWrappedText({ text: 'Service Request Address:' });

    const [addressLine1, ...addressLine2] = data.full_address.split(',')
    pdf.drawWrappedText({ text: [addressLine1, addressLine2.join(',')?.trim?.()] });

    pdf.drawPad(-10);

    const infoList = [
      `Key Provided: ${data.key_provided ? 'Yes' : 'No'}`,
      `Accessible: ${data.accessible ? 'Yes' : 'No'}`,
      `Turn Around: ${data.turn_around ? 'Yes' : 'No'}`,
    ];

    pdf.drawTextList({
      labels: infoList,
      listStyle: 'inline',
      bottomPadding: 10
    });

    // follow up date
    pdf.drawWrappedText({ text: `Followup Date: ${data.followup_date ? new Date(data.followup_date)?.toLocaleDateString?.() : 'Not set'}` });

    // directions
    pdf.drawWrappedText({ text: `Additional Information: ${data.directions || 'No additional information available'}` })

    pdf.drawHRule();

    // contacts
    pdf.drawSectionHeader({ text: `Contacts` });

    pdf.drawPad(20);

    // owners
    if (data.owner_objects.length) {
      data.owner_objects.forEach((owner) => {
        pdf.drawWrappedText({
          text: `Owner: ${owner.first_name} ${owner.last_name} ${owner.display_phone || ''}`
        });

        if (owner.email) {
          pdf.drawWrappedText({
            text: `Owner Email: ${owner.email}`
          });
        }
      })
    } else {
      //no owners
      pdf.drawWrappedText({
        text: 'Owner: No Owner'
      });
    }

    // reporter
    if (data.reporter && data.reporter_object) {
      pdf.drawWrappedText({
        text: `Reporter: ${data.reporter_object.first_name} ${data.reporter_object.last_name} ${data.reporter_object.display_phone || ''}`
      });

      if (data.reporter_object.agency) {
        pdf.drawWrappedText({
          text: `Reporter Agency: ${data.reporter_object.agency}`
        });
      }
    }

    pdf.drawHRule();

    // animals
    function drawAnimalHeader() {
      pdf.drawSectionHeader({ text: 'Animals' });
      pdf.drawPad(10);
    }

    drawAnimalHeader();

    // keep the last y position after a row was drawn
    let lastYPosAfterDraw = pdf.getLastYPositionWithBuffer({ buffer: 0 });
    data.animals.forEach((animal, animalIndex) => {
      // grab the last y position before we draw a row
      let lastYPosBeforeDraw = pdf.getLastYPositionWithBuffer({ buffer: 0 });

      // look ahead to see if this animal will bleed to the next page
      const estimatedAnimalHeight = 209 // this is a magic number, it should change if we add or remove properties to render for animals
      if (pdf.remainderPageHeight <= estimatedAnimalHeight) {
        pdf.drawPageBreak();
        drawAnimalHeader();
        lastYPosBeforeDraw = pdf.getLastYPositionWithBuffer({ buffer: 0 });
      }

      const animalInfoList = [
        `ID: A#${animal.id}`,
        `Status: ${capitalize(animal.status.toLowerCase(), { proper: true })}`,
        `Name: ${animal.name || 'Unknown'}`,
        `Species: ${capitalize(animal.species)}`,
        `Sex: ${capitalize(animal.sex|| 'Unknown')}`,
        `Age: ${capitalize(animal.age || 'Unknown')}`,
        `Size: ${capitalize(animal.size || 'Unknown')}`,
        `Primary Color: ${capitalize(animal.pcolor || 'N/A')}, Secondary Color: ${capitalize(animal.scolor || 'N/A')}`
      ];

      pdf.drawTextList({
        labels: animalInfoList,
        listStyle: 'grid',
        bottomPadding: 0
      });

      pdf.drawPad();

      // breed / description (color_notes)
      if (animal.color_notes) {
        pdf.drawWrappedText({
          text: `Breed / Description: ${animal.color_notes}`,
          linePadding: 0
        });
      }

      // medical notes
      if (animal.medical_notes) {
        pdf.drawWrappedText({
          text: `Medical Notes: ${animal.medical_notes}`,
          linePadding: 0
        });
      }

      // behavior notes
      if (animal.behavior_notes) {
        pdf.drawWrappedText({
          text: `Behavior Notes: ${animal.behavior_notes}`,
          linePadding: 0
        });
      }

      if (animal.shelter) {
        pdf.drawWrappedText({
          text: `Shelter Address: ${animal.shelter_object?.full_address || 'Unknown'}`,
          linePadding: 5
        })
      }

      pdf.drawPad(5);
      pdf.drawHRule();
      lastYPosAfterDraw = pdf.getLastYPositionWithBuffer();

      // If after draw y position is less than before draw, that means there was a page break.
      // Draw the animal header again.
      if (
        lastYPosAfterDraw < lastYPosBeforeDraw &&
        animalIndex < data.animals.length - 1
      ) {
        drawAnimalHeader();
      }
    });

    pdf.setDocumentFontSize();
  });

  return pdf;
}

function printServiceRequestSummary(sr = {}) {
  const pdf = buildServiceRequestsDoc([sr]);
  pdf.fileName = `SR-${sr.id.toString().padStart(3, 0)}`;
  return pdf.saveFile();
}

function printAllServiceRequests(srs = []) {
  const pdf = buildServiceRequestsDoc(srs);
  pdf.fileName = `SRs-${moment().format(DATE_FORMAT)}`;
  return pdf.saveFile();
}

const printSrAnimalCareSchedules  = async (animals = [], srId = 0) => {
  const  pdf = await buildAnimalCareScheduleDoc(animals);
  pdf.fileName = `Shelterly-SR-Animal-Care-Schedules-${srId.toString().padStart(3, 0)}-${moment().format(DATE_FORMAT)}`;
  return pdf.saveFile();
};

export {
  printServiceRequestSummary,
  printAllServiceRequests,
  printSrAnimalCareSchedules
}

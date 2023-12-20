from django.contrib import admin

from vet.models import Treatment, TreatmentPlan, TreatmentRequest, PresentingComplaint, VetRequest

class VetRequestAdmin(admin.ModelAdmin):
  list_display = ('id', 'patient', 'assignee',)

class TreatmentPlanAdmin(admin.ModelAdmin):
  list_display = ('id', 'vet_request', 'treatment',)

class TreatmentAdmin(admin.ModelAdmin):
  list_display = ('id', 'description', 'category',)

class TreatmentRequestAdmin(admin.ModelAdmin):
  list_display = ('id', 'suggested_admin_time',)

class PresentingComplaintAdmin(admin.ModelAdmin):
  list_display = ('id', 'name',)

# Register your models here.
admin.site.register(VetRequest, VetRequestAdmin)
admin.site.register(TreatmentPlan, TreatmentPlanAdmin)
admin.site.register(Treatment, TreatmentAdmin)
admin.site.register(TreatmentRequest, TreatmentRequestAdmin)
admin.site.register(PresentingComplaint, PresentingComplaintAdmin)

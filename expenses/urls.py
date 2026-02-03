from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='dashboard'),
    path('add/', views.add_expense, name='add_expense'),
    path('list/', views.expense_list, name='expense_list'),
    path('summary/', views.monthly_summary, name='monthly_summary'),
    path('signup/', views.signup, name='signup'),
    path('expenses/delete/<int:id>/', views.delete_expense, name='delete_expense'),
]

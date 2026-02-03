from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required

from .forms import ExpenseForm, BudgetForm
from .models import Expense, Budget
from datetime import date
from django.db.models import Sum

@login_required
def dashboard(request):
    today = date.today()
    
    # All expenses
    all_expenses = Expense.objects.filter(user=request.user)
    total_expense = all_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
    total_count = all_expenses.count()
    
    # This month's expenses
    monthly_expenses = all_expenses.filter(
        date__month=today.month,
        date__year=today.year
    )
    monthly_total = monthly_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Get or create budget for this month
    budget, created = Budget.objects.get_or_create(
        user=request.user,
        month=today.month,
        year=today.year,
        defaults={'amount': 0}
    )
    
    # Calculate remaining budget
    remaining_budget = budget.amount - monthly_total if budget.amount > 0 else 0
    budget_percentage = (monthly_total / budget.amount * 100) if budget.amount > 0 else 0
    budget_exceeded = abs(remaining_budget) if remaining_budget < 0 else 0
    
    return render(request, 'expenses/dashboard.html', {
        'expenses': all_expenses,
        'total_expense': total_expense,
        'total_count': total_count,
        'monthly_total': monthly_total,
        'budget_amount': budget.amount,
        'remaining_budget': remaining_budget,
        'budget_percentage': min(budget_percentage, 100),
        'budget_exceeded': budget_exceeded,
        'show_back': False
    })

@login_required
def add_expense(request):
    if request.method == 'POST':
        form = ExpenseForm(request.POST)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.user = request.user
            expense.save()
            return redirect('add_expense')
    else:
        form = ExpenseForm()

    return render(request, 'expenses/add_expense.html', {
        'form': form,
        'show_back': True
    })

@login_required
def expense_list(request):
    expenses = Expense.objects.filter(user=request.user).order_by('-date')

    return render(request, 'expenses/expense_list.html', {
        'expenses': expenses,
        'show_back': True
    })

@login_required
def delete_expense(request, id):
    if request.method == "POST":
        expense = get_object_or_404(Expense, id=id)
        expense.delete()
    return redirect('expense_list')

@login_required
def monthly_summary(request):
    today = date.today()
    month = today.month
    year = today.year

    expenses = Expense.objects.filter(
        user=request.user,
        date__month=month,
        date__year=year
    )

    total = expenses.aggregate(Sum('amount'))['amount__sum'] or 0

    budget, created = Budget.objects.get_or_create(
        user=request.user,
        month=month,
        year=year,
        defaults={'amount': 0}
    )

    if request.method == 'POST':
        form = BudgetForm(request.POST, instance=budget)
        if form.is_valid():
            form.save()
            return redirect('dashboard')
    else:
        form = BudgetForm(instance=budget)

    exceeded = total > budget.amount

    return render(request, 'expenses/summary.html', {
        'total': total,
        'budget': budget,
        'form': form,
        'exceeded': exceeded,
        'show_back': True
    })

from django.contrib.auth import login
from .forms import SignUpForm

def signup(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            return redirect('login')
    else:
        form = SignUpForm()

    return render(request, 'registration/signup.html', {
        'form': form,
        'show_back': False
    })

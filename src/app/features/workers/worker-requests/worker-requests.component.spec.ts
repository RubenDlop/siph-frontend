import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkerRequestsComponent } from './worker-requests.component';

describe('WorkerRequestsComponent', () => {
  let component: WorkerRequestsComponent;
  let fixture: ComponentFixture<WorkerRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkerRequestsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkerRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

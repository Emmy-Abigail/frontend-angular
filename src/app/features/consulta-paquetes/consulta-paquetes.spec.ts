import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultaPaquetes } from './consulta-paquetes';

describe('ConsultaPaquetes', () => {
  let component: ConsultaPaquetes;
  let fixture: ComponentFixture<ConsultaPaquetes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaPaquetes],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultaPaquetes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

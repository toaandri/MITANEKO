import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NouvellePublication } from './nouvelle-publication';

describe('NouvellePublication', () => {
  let component: NouvellePublication;
  let fixture: ComponentFixture<NouvellePublication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NouvellePublication],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NouvellePublication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

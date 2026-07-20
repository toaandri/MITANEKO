import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NouvellePublication } from './nouvelle-publication';

describe('NouvellePublication', () => {
  let component: NouvellePublication;
  let fixture: ComponentFixture<NouvellePublication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NouvellePublication],
    }).compileComponents();

    fixture = TestBed.createComponent(NouvellePublication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
